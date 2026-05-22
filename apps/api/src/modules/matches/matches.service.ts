import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { createNotification } from '../notifications/notifications.service.js';
import { computeElo } from './elo.js';
import type { RecordMatchDto, ValidateMatchDto } from './matches.schema.js';

const PLAYER_SELECT = {
  id: true, name: true, initials: true, avatarUrl: true, level: true,
} as const;

const MATCH_INCLUDE = {
  host:  { select: PLAYER_SELECT },
  guest: { select: PLAYER_SELECT },
} as const;

export async function getMyStats(userId: string) {
  const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [matchesPlayed, wins, upcomingDispos, upcomingQuick, membersTotal] = await Promise.all([
    prisma.match.count({
      where: { OR: [{ hostId: userId }, { guestId: userId }], status: 'confirmed' },
    }),
    prisma.match.count({
      where: { winnerId: userId, status: 'confirmed' },
    }),
    prisma.dispoPost.count({
      where: {
        OR: [
          { userId, requests: { some: { status: 'accepted' } }, match: null, when: { gte: windowStart } },
          { requests: { some: { requesterId: userId, status: 'accepted' } }, match: null, when: { gte: windowStart } },
        ],
      },
    }),
    prisma.quickMatch.count({
      where: {
        OR: [{ challengerId: userId }, { challengedId: userId }],
        status: 'accepted',
        when: { gte: windowStart },
        match: null,
      },
    }),
    prisma.user.count(),
  ]);

  const losses  = matchesPlayed - wins;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  return { matchesPlayed, wins, losses, winRate, upcomingCount: upcomingDispos + upcomingQuick, membersTotal };
}

export async function getMyMatches(userId: string) {
  return prisma.match.findMany({
    where: { OR: [{ hostId: userId }, { guestId: userId }] },
    orderBy: { playedAt: 'desc' },
    include: MATCH_INCLUDE,
  });
}

export async function recordMatch(userId: string, dto: RecordMatchDto) {
  let hostId: string, guestId: string, playedAt: Date, court: string, type: string;
  let dispoPostId: string | undefined;
  let quickMatchId: string | undefined;

  if (dto.sourceType === 'dispo') {
    const dispo = await prisma.dispoPost.findUnique({
      where: { id: dto.sourceId },
      include: { requests: { where: { status: 'accepted' } }, match: true },
    });
    if (!dispo)              throw new AppError(404, 'Annonce introuvable');
    if (!dispo.requests[0]) throw new AppError(400, 'Aucun adversaire confirmé');
    if (dispo.match)        throw new AppError(409, 'Score déjà enregistré');

    const acceptedId = dispo.requests[0].requesterId;
    if (dispo.userId !== userId && acceptedId !== userId)
      throw new AppError(403, 'Vous ne participez pas à ce match');

    hostId      = dispo.userId;
    guestId     = acceptedId;
    playedAt    = dispo.when;
    court       = dispo.court;
    type        = dispo.type;
    dispoPostId = dispo.id;

  } else {
    const qm = await prisma.quickMatch.findUnique({ where: { id: dto.sourceId }, include: { match: true } });
    if (!qm)                   throw new AppError(404, 'Match rapide introuvable');
    if (qm.status !== 'accepted') throw new AppError(400, 'Le défi n\'a pas encore été accepté');
    if (qm.match)              throw new AppError(409, 'Score déjà enregistré');

    if (qm.challengerId !== userId && qm.challengedId !== userId)
      throw new AppError(403, 'Vous ne participez pas à ce match');

    hostId       = qm.challengerId;
    guestId      = qm.challengedId;
    playedAt     = qm.when;
    court        = qm.court;
    type         = qm.type;
    quickMatchId = qm.id;
  }

  const winnerId   = dto.winnerRole === 'host' ? hostId : guestId;
  const opponentId = userId === hostId ? guestId : hostId;

  const match = await prisma.match.create({
    data: {
      hostId, guestId, playedAt, court, type,
      scoreHost:  dto.scoreHost,
      scoreGuest: dto.scoreGuest,
      winnerId,
      status:     'pending',
      recordedBy: userId,
      ...(dispoPostId  ? { dispoPostId }  : {}),
      ...(quickMatchId ? { quickMatchId } : {}),
    },
    include: MATCH_INCLUDE,
  });

  createNotification(opponentId, 'score_to_validate', {
    matchId:    match.id,
    court,
    playedAt:   playedAt.toISOString(),
    scoreHost:  dto.scoreHost,
    scoreGuest: dto.scoreGuest,
  }).catch(() => {});

  return match;
}

async function applyEloUpdate(hostId: string, guestId: string, winnerId: string): Promise<void> {
  const [host, guest] = await Promise.all([
    prisma.user.findUnique({ where: { id: hostId },  select: { rating: true, ratingGames: true } }),
    prisma.user.findUnique({ where: { id: guestId }, select: { rating: true, ratingGames: true } }),
  ]);
  if (!host || !guest) return;

  const hostResult  = computeElo(host.rating,  host.ratingGames,  guest.rating, winnerId === hostId);
  const guestResult = computeElo(guest.rating, guest.ratingGames, host.rating,  winnerId === guestId);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: hostId },
      data:  { rating: hostResult.newRating,  level: hostResult.newLevel,  ratingGames: { increment: 1 }, ratingDelta: hostResult.delta },
    }),
    prisma.user.update({
      where: { id: guestId },
      data:  { rating: guestResult.newRating, level: guestResult.newLevel, ratingGames: { increment: 1 }, ratingDelta: guestResult.delta },
    }),
  ]);
}

export async function validateMatch(matchId: string, userId: string, dto: ValidateMatchDto) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: MATCH_INCLUDE,
  });

  if (!match) throw new AppError(404, 'Match introuvable');

  const isOpponent = (match.hostId === userId || match.guestId === userId) && match.recordedBy !== userId;
  if (!isOpponent) throw new AppError(403, 'Seul l\'adversaire peut valider ce score');
  if (match.status !== 'pending') throw new AppError(409, 'Ce score a déjà été traité');

  const newStatus = dto.action === 'confirm' ? 'confirmed' : 'disputed';

  const updated = await prisma.match.update({
    where: { id: matchId },
    data:  { status: newStatus },
    include: MATCH_INCLUDE,
  });

  if (dto.action === 'confirm') {
    applyEloUpdate(match.hostId, match.guestId, match.winnerId).catch(() => {});
  }

  if (match.recordedBy) {
    const notifType = dto.action === 'confirm' ? 'score_confirmed' : 'score_disputed';
    createNotification(match.recordedBy, notifType, {
      matchId:    match.id,
      court:      match.court,
      playedAt:   match.playedAt.toISOString(),
    }).catch(() => {});
  }

  return updated;
}
