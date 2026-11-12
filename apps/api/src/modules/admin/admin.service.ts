import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { sendBroadcast, pushStats } from '../../lib/webpush.js';
import { bg } from '../../lib/bg.js';
import { refreshBestRanking } from '../../lib/ranking.js';
import type {
  CreateClubDto,
  UpdateClubDto,
  UpdateLevelDto,
  SetRoleDto,
  BroadcastPushDto,
  CreateTournamentDto,
  UpdateTournamentDto,
  SetTournamentResultsDto,
  GenerateBracketDto,
  SetMatchResultDto,
  AddTournamentRegistrantDto,
} from './admin.schema.js';
import crypto from 'node:crypto';
import { categoryLabel, LICENCE_CATEGORIES, type LicenceCategory } from '../licence/licence.rules.js';
import { getBracket } from '../tournaments/tournaments.service.js';
export { getBracket };

/* ─────────────────────────── Vue d'ensemble ─────────────────────────── */

const TOURNAMENT_STATUS_ORDER = ['upcoming', 'open', 'closed', 'completed'] as const;
const TOURNAMENT_STATUS_LABEL: Record<(typeof TOURNAMENT_STATUS_ORDER)[number], string> = {
  upcoming: 'À venir',
  open: 'Ouverts',
  closed: 'Clos',
  completed: 'Terminés',
};

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/** Toutes les métriques clés de la fédération pour le dashboard admin. */
export async function getOverview() {
  const since14d = new Date();
  since14d.setUTCDate(since14d.getUTCDate() - 13);
  since14d.setUTCHours(0, 0, 0, 0);

  const [
    membersCount,
    clubsCount,
    licencesActive,
    licencesRevenue,
    tournamentsTotal,
    tournamentsOpen,
    tournamentRegistrationsTotal,
    matchesConfirmed,
    push,
    newsPublished,
    levelGroups,
    tournamentStatusGroups,
    licenceCategoryGroups,
    recentMatches,
  ] = await Promise.all([
    prisma.user.count({ where: { isGuest: false } }),
    prisma.club.count({ where: { active: true } }),
    prisma.licence.count(),
    prisma.licence.aggregate({ _sum: { amount: true } }),
    prisma.tournament.count(),
    prisma.tournament.count({ where: { status: 'open' } }),
    prisma.tournamentRegistration.count(),
    prisma.match.count({ where: { status: 'confirmed' } }),
    pushStats(),
    prisma.post.count({ where: { status: 'published' } }),
    prisma.user.groupBy({ by: ['level'], where: { isGuest: false }, _count: { id: true } }),
    prisma.tournament.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.licence.groupBy({ by: ['category'], _count: { id: true } }),
    prisma.match.findMany({
      where: { status: 'confirmed', playedAt: { gte: since14d } },
      select: { playedAt: true },
    }),
  ]);

  const levelCount = new Map(levelGroups.map((g) => [g.level, g._count.id]));
  const levelDistribution = [1, 2, 3, 4, 5].map((level) => ({ level, count: levelCount.get(level) ?? 0 }));

  const statusCount = new Map(tournamentStatusGroups.map((g) => [g.status, g._count.id]));
  const tournamentsByStatus = TOURNAMENT_STATUS_ORDER.map((status) => ({
    status, label: TOURNAMENT_STATUS_LABEL[status], count: statusCount.get(status) ?? 0,
  }));

  const licenceCount = new Map(licenceCategoryGroups.map((g) => [g.category as LicenceCategory, g._count.id]));
  const licencesByCategory = LICENCE_CATEGORIES
    .map((category) => ({ category, label: categoryLabel(category), count: licenceCount.get(category) ?? 0 }))
    .filter((c) => c.count > 0 || licencesActive > 0);

  const perDay = new Map<string, number>();
  for (const m of recentMatches) {
    const day = m.playedAt.toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const matchesPerDay = lastNDays(14).map((date) => ({ date, count: perDay.get(date) ?? 0 }));

  return {
    membersCount,
    clubsCount,
    licencesActive,
    licencesRevenue: licencesRevenue._sum.amount ?? 0,
    tournamentsTotal,
    tournamentsOpen,
    tournamentRegistrationsTotal,
    matchesConfirmed,
    pushSubscriptions: push.subscriptions,
    pushUsers: push.users,
    newsPublished,
    levelDistribution,
    tournamentsByStatus,
    licencesByCategory,
    matchesPerDay,
  };
}

/* ─────────────────────────── Clubs ─────────────────────────── */

/** Tous les clubs (actifs et inactifs) pour l'admin. */
export function listAllClubs() {
  return prisma.club.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function createClub(dto: CreateClubDto) {
  try {
    return await prisma.club.create({ data: dto });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'Un club avec ce slug existe déjà');
    }
    throw err;
  }
}

export async function updateClub(id: string, dto: UpdateClubDto) {
  try {
    return await prisma.club.update({ where: { id }, data: dto });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') throw new AppError(404, 'Club introuvable');
      if (err.code === 'P2002') throw new AppError(409, 'Un club avec ce slug existe déjà');
    }
    throw err;
  }
}

export async function setClubImage(id: string, imageUrl: string) {
  try {
    return await prisma.club.update({ where: { id }, data: { imageUrl } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Club introuvable');
    }
    throw err;
  }
}

export async function deleteClub(id: string) {
  const members = await prisma.user.count({ where: { clubId: id } });
  if (members > 0) {
    throw new AppError(
      409,
      `Ce club est rattaché à ${members} membre(s). Désactivez-le plutôt que de le supprimer.`,
    );
  }
  try {
    await prisma.club.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Club introuvable');
    }
    throw err;
  }
}

/* ─────────────────────────── Niveaux ─────────────────────────── */

export function listAllLevels() {
  return prisma.level.findMany({ orderBy: { level: 'asc' } });
}

export async function updateLevel(level: number, dto: UpdateLevelDto) {
  try {
    return await prisma.level.update({ where: { level }, data: dto });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Niveau introuvable');
    }
    throw err;
  }
}

/* ─────────────────────────── Membres ─────────────────────────── */

export function listMembersForAdmin() {
  return prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      initials: true,
      level: true,
      role: true,
      online: true,
      joinedAt: true,
      club: { select: { id: true, name: true } },
    },
  });
}

/* ─────────────────────────── Notifications push ─────────────────────────── */

export function getPushStats() {
  return pushStats();
}

export async function broadcastPush(dto: BroadcastPushDto) {
  return sendBroadcast({ title: dto.title, body: dto.body, url: dto.url, tag: 'atc-annonce' });
}

/* ─────────────────────────── Tournois ─────────────────────────── */

export function listAllTournaments() {
  return prisma.tournament.findMany({
    orderBy: { startDate: 'desc' },
    include: { _count: { select: { registrations: true, results: true } } },
  });
}

export async function createTournament(dto: CreateTournamentDto) {
  if (dto.endDate < dto.startDate) throw new AppError(400, 'La date de fin précède la date de début');
  if (dto.minLevel != null && dto.maxLevel != null && dto.minLevel > dto.maxLevel) {
    throw new AppError(400, 'Le niveau minimum dépasse le niveau maximum');
  }
  const tournament = await prisma.tournament.create({ data: dto });
  bg(
    sendBroadcast({
      title: 'Nouveau tournoi',
      body: tournament.name,
      url: '/tournois',
      tag: 'tenci-tournoi',
    }),
    'push.tournament_created',
    { tournamentId: tournament.id },
  );
  return tournament;
}

export async function updateTournament(id: string, dto: UpdateTournamentDto) {
  if (dto.minLevel != null && dto.maxLevel != null && dto.minLevel > dto.maxLevel) {
    throw new AppError(400, 'Le niveau minimum dépasse le niveau maximum');
  }
  try {
    return await prisma.tournament.update({ where: { id }, data: dto });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Tournoi introuvable');
    }
    throw err;
  }
}

export async function deleteTournament(id: string) {
  try {
    await prisma.tournament.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Tournoi introuvable');
    }
    throw err;
  }
}

export async function getTournamentRegistrations(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { registeredAt: 'asc' },
        include: { user: { select: { id: true, name: true, initials: true, avatarUrl: true, level: true, isGuest: true } } },
      },
      results: true,
    },
  });
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');
  const pointsByUser = new Map(tournament.results.map((r) => [r.userId, r]));
  return {
    id: tournament.id,
    name: tournament.name,
    status: tournament.status,
    maxPlayers: tournament.maxPlayers,
    registrations: tournament.registrations.map((r) => ({
      user: r.user,
      registeredAt: r.registeredAt,
      result: pointsByUser.get(r.userId) ?? null,
    })),
  };
}

function buildInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Inscription saisie par l'admin — soit un membre existant (`userId`), soit un
 * joueur sans compte (`name`, crée un `User` fantôme `isGuest: true` : pas de
 * mot de passe, exclu des listes membres/classement, mais visible comme tout
 * autre inscrit dans ce tournoi et son tableau).
 */
export async function addTournamentRegistrant(tournamentId: string, dto: AddTournamentRegistrantDto) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');

  if (tournament.maxPlayers != null) {
    const count = await prisma.tournamentRegistration.count({ where: { tournamentId } });
    if (count >= tournament.maxPlayers) {
      throw new AppError(409, `Ce tournoi est limité à ${tournament.maxPlayers} joueurs.`);
    }
  }

  let userId: string;
  if (dto.userId) {
    const user = await prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new AppError(404, 'Membre introuvable');
    userId = user.id;
  } else {
    const name = dto.name!.trim();
    const guest = await prisma.user.create({
      data: {
        name,
        initials: buildInitials(name),
        email: `guest.${crypto.randomUUID()}@invite.tenci.local`,
        level: 3,
        isGuest: true,
      },
    });
    userId = guest.id;
  }

  try {
    await prisma.tournamentRegistration.create({ data: { tournamentId, userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'Ce joueur est déjà inscrit à ce tournoi.');
    }
    throw err;
  }
  return getTournamentRegistrations(tournamentId);
}

/** Retrait d'un inscrit par l'admin — supprime aussi le compte fantôme si c'était un joueur sans compte. */
export async function removeTournamentRegistrant(tournamentId: string, userId: string) {
  const reg = await prisma.tournamentRegistration.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
    include: { user: { select: { isGuest: true } } },
  });
  if (!reg) throw new AppError(404, 'Inscription introuvable');

  if (reg.user.isGuest) {
    await prisma.user.delete({ where: { id: userId } }); // cascade supprime l'inscription
  } else {
    await prisma.tournamentRegistration.delete({ where: { tournamentId_userId: { tournamentId, userId } } });
  }
  return getTournamentRegistrations(tournamentId);
}

/** Saisie des points par joueur à la clôture d'un tournoi — seule source du classement officiel. */
export async function setTournamentResults(id: string, dto: SetTournamentResultsDto) {
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');

  await prisma.$transaction([
    ...dto.results.map((r) =>
      prisma.tournamentResult.upsert({
        where: { tournamentId_userId: { tournamentId: id, userId: r.userId } },
        create: { tournamentId: id, userId: r.userId, points: r.points, position: r.position ?? null },
        update: { points: r.points, position: r.position ?? null },
      }),
    ),
    prisma.tournament.update({ where: { id }, data: { status: 'completed' } }),
  ]);

  for (const r of dto.results) {
    bg(refreshBestRanking(r.userId), 'ranking.refresh', { userId: r.userId });
  }

  return getTournamentRegistrations(id);
}

/* ─────────────────────────── Tableau (bracket) ─────────────────────────── */
/* La lecture (getBracket) vit dans tournaments.service.ts, partagée avec la
 * vue publique gatée par bracketPublished — voir getPublishedBracket là-bas. */

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/**
 * Tirage au sort du tableau à élimination directe. Les inscrits sont mélangés
 * puis répartis sur le prochain tableau de taille puissance de 2 ; les places
 * vacantes sont des « byes » auto-résolus au 1er tour. `force` efface un
 * tableau déjà tiré pour en refaire un (perd les scores déjà saisis).
 */
export async function generateBracket(tournamentId: string, dto: GenerateBracketDto) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { registrations: true },
  });
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');

  const existing = await prisma.tournamentMatch.count({ where: { tournamentId } });
  if (existing > 0 && !dto.force) {
    throw new AppError(409, 'Un tableau existe déjà pour ce tournoi — relance le tirage pour le refaire.');
  }

  const playerIds = shuffle(tournament.registrations.map((r) => r.userId));
  if (playerIds.length < 2) throw new AppError(400, 'Il faut au moins 2 inscrits pour tirer un tableau.');

  const size = nextPowerOfTwo(playerIds.length);
  const totalRounds = Math.log2(size);
  const matchCount = size / 2;
  const byeCount = size - playerIds.length; // toujours < matchCount (puisque size < 2 * playerIds.length)

  // Un « plan » par match du 1er tour : les `byeCount` premiers reçoivent un seul
  // joueur (qualifié d'office), les autres deux — jamais deux byes dans un même
  // match. L'ordre est mélangé pour ne pas regrouper visuellement les byes.
  const plan = shuffle([
    ...Array.from({ length: byeCount }, () => 'bye' as const),
    ...Array.from({ length: matchCount - byeCount }, () => 'pair' as const),
  ]);

  const pool = [...playerIds];
  const round1 = plan.map((kind, slot) => {
    const a = pool.shift() ?? null;
    const b = kind === 'pair' ? pool.shift() ?? null : null;
    const winnerId = a && !b ? a : null; // bye auto-résolu
    return { tournamentId, round: 1, slot, playerAId: a, playerBId: b, winnerId, playedAt: winnerId ? new Date() : null };
  });

  // Byes du 1er tour alimentent directement le tour suivant.
  const round2Seed = new Map<number, { playerAId?: string | null; playerBId?: string | null }>();
  for (const m of round1) {
    if (!m.winnerId) continue;
    const nextSlot = Math.floor(m.slot / 2);
    const seed = round2Seed.get(nextSlot) ?? {};
    if (m.slot % 2 === 0) seed.playerAId = m.winnerId;
    else seed.playerBId = m.winnerId;
    round2Seed.set(nextSlot, seed);
  }

  await prisma.$transaction(async (tx) => {
    if (dto.force) {
      await tx.tournamentMatch.deleteMany({ where: { tournamentId } });
      // Un nouveau tirage invalide la publication précédente — l'admin doit valider et republier.
      await tx.tournament.update({ where: { id: tournamentId }, data: { bracketPublished: false } });
    }
    await tx.tournamentMatch.createMany({ data: round1 });
    for (let round = 2; round <= totalRounds; round++) {
      const count = size / 2 ** round;
      const data = Array.from({ length: count }, (_, slot) => {
        const seed = round === 2 ? round2Seed.get(slot) : undefined;
        return {
          tournamentId, round, slot,
          playerAId: seed?.playerAId ?? null,
          playerBId: seed?.playerBId ?? null,
        };
      });
      await tx.tournamentMatch.createMany({ data });
    }
  });

  return getBracket(tournamentId);
}

/** Invalide les résultats déjà saisis en aval d'un match (une correction remonte toute la suite du tableau). */
async function invalidateDownstream(tournamentId: string, round: number, slot: number): Promise<void> {
  let r = round;
  let s = slot;
  for (;;) {
    const nextRound = r + 1;
    const nextSlot = Math.floor(s / 2);
    const next = await prisma.tournamentMatch.findUnique({
      where: { tournamentId_round_slot: { tournamentId, round: nextRound, slot: nextSlot } },
    });
    if (!next) return;
    const field = s % 2 === 0 ? 'playerAId' : 'playerBId';
    await prisma.tournamentMatch.update({
      where: { id: next.id },
      data: { [field]: null, winnerId: null, scoreText: null, playedAt: null },
    });
    r = nextRound;
    s = nextSlot;
  }
}

/** Saisie du score + vainqueur d'un match ; fait avancer le vainqueur au tour suivant. */
export async function setMatchResult(tournamentId: string, matchId: string, dto: SetMatchResultDto) {
  const match = await prisma.tournamentMatch.findFirst({ where: { id: matchId, tournamentId } });
  if (!match) throw new AppError(404, 'Match introuvable');
  if (!match.playerAId || !match.playerBId) {
    throw new AppError(400, 'Les deux joueurs doivent être connus pour saisir un résultat.');
  }
  if (dto.winnerId !== match.playerAId && dto.winnerId !== match.playerBId) {
    throw new AppError(400, 'Le vainqueur doit être un des deux joueurs du match.');
  }

  await invalidateDownstream(tournamentId, match.round, match.slot);
  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: { winnerId: dto.winnerId, scoreText: dto.scoreText, playedAt: new Date() },
  });

  const nextSlot = Math.floor(match.slot / 2);
  const next = await prisma.tournamentMatch.findUnique({
    where: { tournamentId_round_slot: { tournamentId, round: match.round + 1, slot: nextSlot } },
  });
  if (next) {
    const field = match.slot % 2 === 0 ? 'playerAId' : 'playerBId';
    await prisma.tournamentMatch.update({ where: { id: next.id }, data: { [field]: dto.winnerId } });
  }

  return getBracket(tournamentId);
}

/**
 * Échange la position de deux joueurs au 1er tour — pour laisser l'admin
 * composer le tableau à la main plutôt que de subir le tirage au sort.
 * Refusé si l'un des deux matchs concernés a déjà un résultat saisi (y
 * compris un bye auto-résolu), pour ne jamais invalider un résultat existant.
 */
export async function swapBracketPlayers(tournamentId: string, userIdA: string, userIdB: string) {
  if (userIdA === userIdB) throw new AppError(400, 'Choisis deux joueurs différents.');

  const round1 = await prisma.tournamentMatch.findMany({ where: { tournamentId, round: 1 } });
  if (round1.length === 0) throw new AppError(404, 'Aucun tableau généré pour ce tournoi.');

  const locate = (userId: string) => {
    for (const m of round1) {
      if (m.playerAId === userId) return { match: m, side: 'playerAId' as const };
      if (m.playerBId === userId) return { match: m, side: 'playerBId' as const };
    }
    return null;
  };
  const posA = locate(userIdA);
  const posB = locate(userIdB);
  if (!posA || !posB) throw new AppError(404, "L'un des deux joueurs n'est pas positionné au 1er tour.");
  if (posA.match.winnerId || posB.match.winnerId) {
    throw new AppError(409, 'Impossible d\'échanger : un des deux matchs a déjà un résultat (ou un bye auto-résolu).');
  }

  if (posA.match.id === posB.match.id) {
    await prisma.tournamentMatch.update({
      where: { id: posA.match.id },
      data: { playerAId: userIdB, playerBId: userIdA },
    });
  } else {
    await prisma.$transaction([
      prisma.tournamentMatch.update({ where: { id: posA.match.id }, data: { [posA.side]: userIdB } }),
      prisma.tournamentMatch.update({ where: { id: posB.match.id }, data: { [posB.side]: userIdA } }),
    ]);
  }

  return getBracket(tournamentId);
}

/** Bascule la visibilité publique du tableau — rien n'est visible côté joueurs tant que l'admin n'a pas validé/publié. */
export async function setBracketPublished(tournamentId: string, published: boolean) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new AppError(404, 'Tournoi introuvable');
  if (published) {
    const count = await prisma.tournamentMatch.count({ where: { tournamentId } });
    if (count === 0) throw new AppError(400, 'Génère le tableau avant de le publier.');
  }
  await prisma.tournament.update({ where: { id: tournamentId }, data: { bracketPublished: published } });
  return getBracket(tournamentId);
}

export async function setMemberRole(targetId: string, adminId: string, dto: SetRoleDto) {
  if (targetId === adminId && dto.role !== 'admin') {
    throw new AppError(400, 'Vous ne pouvez pas retirer votre propre rôle administrateur');
  }
  try {
    return await prisma.user.update({
      where: { id: targetId },
      data: { role: dto.role },
      select: { id: true, name: true, role: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError(404, 'Membre introuvable');
    }
    throw err;
  }
}
