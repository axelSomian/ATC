import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { createNotification } from '../notifications/notifications.service.js';
import { sendScoreToValidate, sendScoreConfirmed, sendScoreDisputed } from '../mailer/mailer.service.js';
import { computeElo, movFromScore } from './elo.js';
import { refreshAndNotify } from '../badges/badges.service.js';
import { bg } from '../../lib/bg.js';
import { getRankByTournamentPoints } from '../../lib/ranking.js';
import type { RecordMatchDto, ValidateMatchDto, MyMatchesQueryDto } from './matches.schema.js';

const PLAYER_SELECT = {
  id: true, name: true, initials: true, avatarUrl: true, level: true,
} as const;

const MATCH_INCLUDE = {
  host:  { select: PLAYER_SELECT },
  guest: { select: PLAYER_SELECT },
} as const;

export async function getMyStats(userId: string) {
  const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [matchesPlayed, wins, upcomingDispos, upcomingQuick, membersTotal, me, rank] = await Promise.all([
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
    prisma.user.findUnique({
      where: { id: userId },
      select: { ratingDelta: true },
    }),
    getRankByTournamentPoints(userId),
  ]);

  const losses  = matchesPlayed - wins;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  return {
    matchesPlayed, wins, losses, winRate,
    upcomingCount: upcomingDispos + upcomingQuick,
    membersTotal,
    rank,
    ratingDelta: me?.ratingDelta ?? null,
  };
}

export async function getMyMatches(userId: string, dto: MyMatchesQueryDto) {
  const { page, limit } = dto;
  const skip = (page - 1) * limit;
  const where = { OR: [{ hostId: userId }, { guestId: userId }] };

  const [total, data] = await Promise.all([
    prisma.match.count({ where }),
    prisma.match.findMany({
      where,
      orderBy: { playedAt: 'desc' },
      include: MATCH_INCLUDE,
      skip,
      take: limit,
    }),
  ]);

  return { data, total, page, limit, pages: Math.ceil(total / limit) };
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

  // Email à l'adversaire (fire-and-forget)
  prisma.user.findMany({
    where: { id: { in: [opponentId, userId] } },
    select: { id: true, name: true, email: true },
  }).then((users: { id: string; name: string; email: string }[]) => {
    const opponent  = users.find((u: { id: string }) => u.id === opponentId);
    const submitter = users.find((u: { id: string }) => u.id === userId);
    if (!opponent?.email || !submitter) return;
    sendScoreToValidate({
      to:              opponent.email,
      recipientName:   opponent.name,
      submitterName:   submitter.name,
      court,
      playedAt,
      scoreHost:       dto.scoreHost,
      scoreGuest:      dto.scoreGuest,
      isRecipientHost: opponentId === hostId,
    });
  }).catch(() => {});

  return match;
}

export async function applyEloUpdate(
  hostId: string,
  guestId: string,
  winnerId: string,
  scoreHost?: string,
  matchId?: string,
): Promise<void> {
  const [host, guest] = await Promise.all([
    prisma.user.findUnique({ where: { id: hostId },  select: { rating: true, ratingGames: true } }),
    prisma.user.findUnique({ where: { id: guestId }, select: { rating: true, ratingGames: true } }),
  ]);
  if (!host || !guest) return;

  // Facteur de marge du score, identique pour les deux joueurs (préserve la
  // somme quasi nulle). Score absent ou illisible → 1 (aucune modulation).
  const mov = scoreHost ? movFromScore(scoreHost, winnerId === hostId) : 1;

  const hostResult  = computeElo(host.rating,  host.ratingGames,  guest.rating, winnerId === hostId,  mov);
  const guestResult = computeElo(guest.rating, guest.ratingGames, host.rating,  winnerId === guestId, mov);

  // Pivot fédéral (nov. 2026) : le niveau affiché est déclaratif (choisi par le
  // joueur à l'inscription / dans son profil) — l'ELO continue de tourner en
  // coulisses (enjeu de match, badges, cartes partageables) mais ne modifie
  // plus jamais `level`, et n'alimente plus le classement officiel (voir
  // TournamentResult / getRankings).
  await prisma.$transaction([
    prisma.user.update({
      where: { id: hostId },
      data:  {
        rating: hostResult.newRating,
        ratingGames: { increment: 1 },
        ratingDelta: hostResult.delta,
      },
    }),
    prisma.user.update({
      where: { id: guestId },
      data:  {
        rating: guestResult.newRating,
        ratingGames: { increment: 1 },
        ratingDelta: guestResult.delta,
      },
    }),
    // Contexte figé pour le calcul des badges (outsider, le tombeur, le déclic).
    ...(matchId
      ? [prisma.match.update({
          where: { id: matchId },
          data:  { hostRatingBefore: host.rating, guestRatingBefore: guest.rating },
        })]
      : []),
  ]);

  // Recalcul des hauts faits « historique » + notif des nouveaux.
  bg(refreshAndNotify(hostId),  'badges.refresh', { userId: hostId });
  bg(refreshAndNotify(guestId), 'badges.refresh', { userId: guestId });
  // `bestRanking` (meilleur classement officiel atteint) ne bouge plus ici — il
  // n'est mis à jour qu'à la saisie des résultats de tournoi (voir
  // updateBestRankingFromPoints dans admin.service.ts), seule source du classement.
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
    data:  {
      status: newStatus,
      ...(newStatus === 'disputed' ? { wasDisputed: true } : {}),
    },
    include: MATCH_INCLUDE,
  });

  if (dto.action === 'confirm') {
    bg(applyEloUpdate(match.hostId, match.guestId, match.winnerId, match.scoreHost, match.id), 'elo.update', { matchId: match.id });
  }

  if (match.recordedBy) {
    const notifType = dto.action === 'confirm' ? 'score_confirmed' : 'score_disputed';
    createNotification(match.recordedBy, notifType, {
      matchId:    match.id,
      court:      match.court,
      playedAt:   match.playedAt.toISOString(),
    }).catch(() => {});

    // Email au soumetteur du score (fire-and-forget)
    prisma.user.findUnique({
      where: { id: match.recordedBy },
      select: { email: true, name: true },
    }).then((submitter: { email: string; name: string } | null) => {
      if (!submitter?.email) return;
      const opponent = match.hostId === match.recordedBy ? match.guest : match.host;
      const won      = match.winnerId === match.recordedBy;
      if (dto.action === 'confirm') {
        sendScoreConfirmed({
          to:           submitter.email,
          submitterName: submitter.name,
          opponentName:  opponent.name,
          court:         match.court,
          playedAt:      match.playedAt,
          won,
        });
      } else {
        sendScoreDisputed({
          to:           submitter.email,
          submitterName: submitter.name,
          opponentName:  opponent.name,
          court:         match.court,
          playedAt:      match.playedAt,
        });
      }
    }).catch(() => {});
  }

  return updated;
}
