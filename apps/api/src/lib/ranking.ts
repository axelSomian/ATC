import { prisma } from './prisma.js';
import { countedResults, rankingTotal, validityCutoff, expiresAt, categoryOf, CATEGORY_LABEL } from '../modules/tournaments/ranking.rules.js';

// Classement fédéral (pivot nov. 2026) : uniquement les points de tournoi
// (TournamentResult), plus jamais l'ELO des matchs amicaux (User.rating).
// Depuis le 14/11 : 6 meilleurs résultats des 12 derniers mois (voir
// modules/tournaments/ranking.rules.ts). Calculé à la lecture — aucune tâche
// planifiée (Render dort) : l'expiration est donc toujours à jour.
// `rank` = null tant que le joueur n'a aucun point valide.

export interface Standing {
  userId: string;
  points: number;
  rank: number;
}

/** Classement complet (hors comptes fantômes), trié. Les ex æquo partagent le même rang. */
export async function getStandings(now: Date = new Date()): Promise<Standing[]> {
  const results = await prisma.tournamentResult.findMany({
    where: { earnedAt: { gte: validityCutoff(now) }, user: { isGuest: false } },
    select: { userId: true, points: true, earnedAt: true },
  });

  const byUser = new Map<string, { points: number; earnedAt: Date }[]>();
  for (const r of results) {
    const list = byUser.get(r.userId) ?? [];
    list.push(r);
    byUser.set(r.userId, list);
  }

  const totals = [...byUser.entries()]
    .map(([userId, list]) => ({ userId, points: rankingTotal(list, now) }))
    .filter((t) => t.points > 0)
    .sort((a, b) => b.points - a.points);

  return totals.map((t) => ({ ...t, rank: totals.filter((o) => o.points > t.points).length + 1 }));
}

export async function getUserTournamentPoints(userId: string): Promise<number> {
  const results = await prisma.tournamentResult.findMany({
    where: { userId, earnedAt: { gte: validityCutoff() } },
    select: { points: true, earnedAt: true },
  });
  return rankingTotal(results);
}

export async function getRankByTournamentPoints(userId: string): Promise<number | null> {
  const standings = await getStandings();
  return standings.find((s) => s.userId === userId)?.rank ?? null;
}

/** Détail des points d'un joueur : résultats qui comptent + ceux qui ne comptent pas (hors top 6 ou expirés). */
export async function getUserPointsBreakdown(userId: string) {
  const results = await prisma.tournamentResult.findMany({
    where: { userId },
    orderBy: { earnedAt: 'desc' },
    select: {
      tournamentId: true, points: true, position: true, level: true, category: true, source: true, earnedAt: true,
      tournament: { select: { name: true } },
    },
  });
  const counted = new Set(countedResults(results).map((r) => r.tournamentId));
  const now = new Date();
  return {
    total: rankingTotal(results),
    results: results.map((r) => ({
      tournamentId: r.tournamentId,
      tournamentName: r.tournament.name,
      points: r.points,
      position: r.position,
      level: r.level,
      category: r.category ? categoryOf(r.category) : null,
      categoryLabel: r.category ? CATEGORY_LABEL[categoryOf(r.category)] : null,
      source: r.source,
      earnedAt: r.earnedAt,
      expiresAt: expiresAt(r.earnedAt),
      expired: expiresAt(r.earnedAt) < now,
      counted: counted.has(r.tournamentId),
    })),
  };
}

/** Met à jour `bestRanking` si le classement actuel du joueur est meilleur (plus petit). */
export async function refreshBestRanking(userId: string): Promise<void> {
  const rank = await getRankByTournamentPoints(userId);
  if (rank === null) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { bestRanking: true } });
  if (!user) return;
  if (user.bestRanking === null || rank < user.bestRanking) {
    await prisma.user.update({ where: { id: userId }, data: { bestRanking: rank } });
  }
}
