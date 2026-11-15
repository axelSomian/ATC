import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { bg } from '../../lib/bg.js';
import { log } from '../../lib/logger.js';
import { refreshBestRanking } from '../../lib/ranking.js';
import { createNotification } from '../notifications/notifications.service.js';
import {
  resultsFromBracket,
  resultPoints,
  tournamentLevel,
  categoryOf,
  levelUpTarget,
  validityCutoff,
  CATEGORY_MIN_PLAYERS,
  CATEGORY_LABEL,
  MAX_LEVEL,
} from './ranking.rules.js';

/* ─────────────────────────── Points automatiques ─────────────────────────── */

/**
 * Recalcule les résultats d'un tournoi depuis son tableau. Idempotent : appelé
 * après chaque score saisi ou corrigé.
 * - finale jouée → tous les résultats du tournoi sont remplacés par le calcul
 *   (y compris d'anciens points manuels), tournoi passé « terminé », montées vérifiées ;
 * - finale pas (ou plus) jouée → les résultats automatiques sont retirés et un
 *   tournoi « terminé » repasse « clos ».
 */
export async function syncTournamentResults(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, maxLevel: true, category: true, endDate: true, status: true },
  });
  if (!tournament) return;

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    select: { round: true, playerAId: true, playerBId: true, winnerId: true },
  });
  const computed = resultsFromBracket(matches);

  if (!computed) {
    const removed = await prisma.tournamentResult.deleteMany({ where: { tournamentId, source: 'auto' } });
    if (removed.count > 0 && tournament.status === 'completed') {
      await prisma.tournament.update({ where: { id: tournamentId }, data: { status: 'closed' } });
    }
    return;
  }

  const totalRounds = Math.max(...matches.map((m) => m.round));
  const level = tournamentLevel(tournament.maxLevel);
  const category = categoryOf(tournament.category);

  await prisma.$transaction([
    prisma.tournamentResult.deleteMany({ where: { tournamentId } }),
    prisma.tournamentResult.createMany({
      data: computed.map((r) => ({
        tournamentId,
        userId: r.userId,
        points: resultPoints({ level, category, roundReached: r.roundReached, totalRounds, isChampion: r.isChampion }),
        position: r.position,
        roundReached: r.roundReached,
        level,
        category,
        source: 'auto',
        earnedAt: tournament.endDate,
      })),
    }),
    prisma.tournament.update({ where: { id: tournamentId }, data: { status: 'completed' } }),
  ]);
  log.info('tournament.results.synced', { tournamentId, players: computed.length, tournamentLevel: level, category });

  for (const r of computed) bg(refreshBestRanking(r.userId), 'ranking.refresh', { userId: r.userId });

  const champion = computed.find((r) => r.isChampion);
  if (champion) await checkLevelUp(champion.userId);
}

/** Refuse le tirage si le tableau est trop petit pour la catégorie du tournoi. */
export function assertMinPlayers(category: string, registered: number): void {
  const cat = categoryOf(category);
  const min = CATEGORY_MIN_PLAYERS[cat];
  if (registered < min) {
    throw new AppError(
      400,
      `Un tournoi ${CATEGORY_LABEL[cat]} demande au moins ${min} inscrits pour tirer le tableau (${registered} actuellement). Change la catégorie ou attends d'autres inscriptions.`,
    );
  }
}

/* ─────────────────────────── Montée de niveau ─────────────────────────── */

/**
 * Vérifie si un joueur doit monter de niveau après ses victoires, et applique
 * la montée (automatique, annulable par l'admin). Comptes fantômes ignorés.
 */
export async function checkLevelUp(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { level: true, isGuest: true } });
  if (!user || user.isGuest || user.level >= MAX_LEVEL) return;

  const [wins, previous] = await Promise.all([
    prisma.tournamentResult.findMany({
      where: { userId, position: 1, level: { not: null }, earnedAt: { gte: validityCutoff() } },
      select: { tournamentId: true, level: true, earnedAt: true },
    }),
    prisma.levelChange.findMany({ where: { userId, source: 'auto' }, select: { tournamentIds: true } }),
  ]);
  // Une victoire qui a déjà servi à une montée (même annulée) ne recompte jamais :
  // sinon une montée annulée par l'admin se redéclencherait au prochain calcul.
  const consumed = new Set(previous.flatMap((p) => p.tournamentIds));
  const target = levelUpTarget(
    user.level,
    wins.map((w) => ({ tournamentId: w.tournamentId, level: w.level as number, earnedAt: w.earnedAt })),
    consumed,
  );
  if (!target) return;

  const fromLevel = user.level;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { level: target.toLevel } }),
    prisma.levelChange.create({
      data: {
        userId,
        fromLevel,
        toLevel: target.toLevel,
        source: 'auto',
        reason: target.tournamentIds.length === 1 ? `Victoire dans un tournoi N${target.toLevel}` : `${target.tournamentIds.length} tournois gagnés`,
        tournamentIds: target.tournamentIds,
      },
    }),
  ]);
  log.info('level.up', { userId, fromLevel, toLevel: target.toLevel });
  bg(createNotification(userId, 'level_up', { fromLevel, toLevel: target.toLevel }), 'notify.level_up', { userId });
}

/* ─────────────────────────── Admin ─────────────────────────── */

/** Changement manuel par l'admin — seul moyen de faire descendre un joueur. */
export async function setMemberLevel(targetId: string, adminId: string, toLevel: number, reason: string | null) {
  const user = await prisma.user.findUnique({ where: { id: targetId }, select: { level: true } });
  if (!user) throw new AppError(404, 'Membre introuvable');
  if (user.level === toLevel) throw new AppError(400, `Ce joueur est déjà niveau ${toLevel}`);

  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: targetId }, data: { level: toLevel }, select: { id: true, name: true, level: true } }),
    prisma.levelChange.create({
      data: { userId: targetId, fromLevel: user.level, toLevel, source: 'admin', reason, createdById: adminId },
    }),
  ]);
  bg(createNotification(targetId, 'level_changed', { fromLevel: user.level, toLevel }), 'notify.level_changed', { userId: targetId });
  return updated;
}

export async function listLevelChanges(limit = 50) {
  const changes = await prisma.levelChange.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { id: true, name: true, initials: true, avatarUrl: true, level: true } } },
  });
  const tournamentIds = [...new Set(changes.flatMap((c) => c.tournamentIds))];
  const tournaments = tournamentIds.length
    ? await prisma.tournament.findMany({ where: { id: { in: tournamentIds } }, select: { id: true, name: true } })
    : [];
  const names = new Map(tournaments.map((t) => [t.id, t.name]));
  return changes.map((c) => ({
    id: c.id,
    user: c.user,
    fromLevel: c.fromLevel,
    toLevel: c.toLevel,
    source: c.source,
    reason: c.reason,
    tournaments: c.tournamentIds.map((id) => ({ id, name: names.get(id) ?? 'Tournoi supprimé' })),
    createdAt: c.createdAt,
    revertedAt: c.revertedAt,
    // Annulable tant que le joueur est toujours au niveau atteint par ce changement.
    revertible: !c.revertedAt && c.user.level === c.toLevel,
  }));
}

/** Annule un changement de niveau : le joueur revient à son ancien niveau. */
export async function revertLevelChange(changeId: string, adminId: string) {
  const change = await prisma.levelChange.findUnique({ where: { id: changeId }, include: { user: { select: { level: true } } } });
  if (!change) throw new AppError(404, 'Changement introuvable');
  if (change.revertedAt) throw new AppError(409, 'Ce changement a déjà été annulé');
  if (change.user.level !== change.toLevel) {
    throw new AppError(409, 'Le niveau du joueur a changé depuis — modifie-le directement.');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: change.userId }, data: { level: change.fromLevel } }),
    prisma.levelChange.update({ where: { id: changeId }, data: { revertedAt: new Date(), revertedById: adminId } }),
  ]);
  bg(
    createNotification(change.userId, 'level_changed', { fromLevel: change.toLevel, toLevel: change.fromLevel }),
    'notify.level_changed',
    { userId: change.userId },
  );
  return listLevelChanges();
}

/**
 * Le joueur peut choisir son niveau lui-même tant qu'il n'est entré dans aucun
 * tournoi et que son niveau n'a jamais été fixé par le système ou l'admin
 * (cas des comptes Google qui arrivent en N1 par défaut). Ensuite : système ou admin.
 */
export async function canSelfEditLevel(userId: string): Promise<boolean> {
  const [registrations, results, changes] = await Promise.all([
    prisma.tournamentRegistration.count({ where: { userId } }),
    prisma.tournamentResult.count({ where: { userId } }),
    prisma.levelChange.count({ where: { userId } }),
  ]);
  return registrations + results + changes === 0;
}
