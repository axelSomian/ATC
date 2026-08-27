import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import type { CreateDispoDto, DisposQueryDto } from './dispos.schema.js';
import { createNotification } from '../notifications/notifications.service.js';
import { emitToAll } from '../../lib/socket.js';

const USER_SELECT = {
  id: true, name: true, initials: true,
  avatarUrl: true, level: true, city: true,
} as const;

const DISPO_SELECT = {
  id: true, when: true, duration: true, court: true,
  type: true, note: true, createdAt: true, userId: true,
  user:     { select: USER_SELECT },
  requests: { select: { id: true, requesterId: true, status: true } },
} as const;

export async function listDispos(dto: DisposQueryDto) {
  const { date, type, court, level, page, limit } = dto;
  const now = new Date();
  const skip = (page - 1) * limit;

  const when = date
    ? { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86_400_000) }
    : { gte: now };

  const where: Record<string, unknown> = {
    when,
    requests: { none: { status: 'accepted' } },
    ...(type  ? { type }  : {}),
    ...(court ? { court: { contains: court, mode: 'insensitive' } } : {}),
    ...(level ? { user: { level } } : {}),
  };

  const [total, data] = await Promise.all([
    prisma.dispoPost.count({ where }),
    prisma.dispoPost.findMany({
      where, select: DISPO_SELECT, skip, take: limit, orderBy: { when: 'asc' },
    }),
  ]);

  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getMyDispos(userId: string) {
  const dispos = await prisma.dispoPost.findMany({
    where: { userId },
    select: {
      ...DISPO_SELECT,
      requests: { select: { id: true, requesterId: true, status: true } },
    },
    orderBy: { when: 'desc' },
  });

  const requesterIds = [...new Set(dispos.flatMap(d => d.requests.map(r => r.requesterId)))];

  const requesters =
    requesterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: requesterIds } },
          select: USER_SELECT,
        })
      : [];

  const byId = Object.fromEntries(requesters.map(u => [u.id, u]));

  return dispos.map(d => ({
    ...d,
    requests: d.requests.map(r => ({ ...r, requester: byId[r.requesterId] ?? null })),
  }));
}

export async function createDispo(userId: string, dto: CreateDispoDto) {
  const dispo = await prisma.dispoPost.create({
    data: { ...dto, userId, when: new Date(dto.when) },
    select: DISPO_SELECT,
  });
  emitToAll('dispo:new', dispo);
  return dispo;
}

export async function deleteDispo(userId: string, dispoId: string) {
  const dispo = await prisma.dispoPost.findUnique({ where: { id: dispoId } });
  if (!dispo)              throw new AppError(404, 'Annonce introuvable');
  if (dispo.userId !== userId) throw new AppError(403, 'Non autorisé');
  await prisma.dispoPost.delete({ where: { id: dispoId } });
}

export async function requestDispo(dispoPostId: string, requesterId: string) {
  const dispo = await prisma.dispoPost.findUnique({
    where: { id: dispoPostId },
    include: { requests: { where: { requesterId } } },
  });
  if (!dispo) throw new AppError(404, 'Annonce introuvable');
  if (dispo.userId === requesterId) throw new AppError(400, 'Vous ne pouvez pas rejoindre votre propre annonce');
  if (dispo.requests.length > 0)   throw new AppError(409, 'Vous avez déjà envoyé une demande');

  const [matchRequest, requester] = await Promise.all([
    prisma.matchRequest.create({ data: { dispoPostId, requesterId, status: 'pending' } }),
    prisma.user.findUnique({ where: { id: requesterId }, select: { name: true } }),
  ]);

  createNotification(dispo.userId, 'match_request', {
    requesterId,
    requesterName: requester?.name ?? 'Un joueur',
    dispoId: dispoPostId,
    when: dispo.when.toISOString(),
    court: dispo.court,
  }).catch(() => {});

  return matchRequest;
}

export async function getUpcomingForUser(userId: string) {
  const USER_SEL = { id: true, name: true, initials: true, avatarUrl: true, level: true } as const;
  // Fenêtre : 7 jours en arrière (matchs récents pas encore enregistrés) → futur
  const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // ── Dispo-based (organisateur) ──
  const hosted = await prisma.dispoPost.findMany({
    where: {
      userId,
      when:     { gte: windowStart },
      requests: { some: { status: 'accepted' } },
      match:    null, // pas encore enregistré
    },
    select: {
      id: true, when: true, duration: true, court: true, type: true,
      requests: { where: { status: 'accepted' }, select: { id: true, requesterId: true } },
    },
    orderBy: { when: 'asc' },
  });

  const requesterIds = [...new Set(hosted.flatMap(d => d.requests.map(r => r.requesterId)))];
  const requesters   = requesterIds.length
    ? await prisma.user.findMany({ where: { id: { in: requesterIds } }, select: USER_SEL })
    : [];
  const byId = Object.fromEntries(requesters.map(u => [u.id, u]));

  const asHost = hosted.map(d => ({
    id: d.id, when: d.when, duration: d.duration as number | null, court: d.court, type: d.type,
    role: 'host' as const, source: 'dispo' as const,
    opponent: byId[d.requests[0]?.requesterId] ?? null,
  }));

  // ── Dispo-based (invité) ──
  const acceptedReqs = await prisma.matchRequest.findMany({
    where: {
      requesterId: userId,
      status:      'accepted',
      dispoPost:   { when: { gte: windowStart }, match: null },
    },
    select: {
      dispoPost: {
        select: {
          id: true, when: true, duration: true, court: true, type: true,
          user: { select: USER_SEL },
        },
      },
    },
    orderBy: { dispoPost: { when: 'asc' } },
  });

  const asGuest = acceptedReqs.map(r => ({
    id: r.dispoPost.id, when: r.dispoPost.when, duration: r.dispoPost.duration as number | null,
    court: r.dispoPost.court, type: r.dispoPost.type,
    role: 'guest' as const, source: 'dispo' as const, opponent: r.dispoPost.user,
  }));

  // ── Quick matches acceptés ──
  const quickMatches = await prisma.quickMatch.findMany({
    where: {
      OR: [{ challengerId: userId }, { challengedId: userId }],
      status: 'accepted',
      when:   { gte: windowStart },
      match:  null,
    },
    orderBy: { when: 'asc' },
  });

  const qUserIds = [...new Set(quickMatches.flatMap(q => [q.challengerId, q.challengedId]))];
  const qUsers   = qUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: qUserIds } }, select: USER_SEL })
    : [];
  const qById = Object.fromEntries(qUsers.map(u => [u.id, u]));

  const asQuick = quickMatches.map(q => {
    const isChallenger = q.challengerId === userId;
    return {
      id:       q.id,
      when:     q.when,
      duration: null as number | null,
      court:    q.court,
      type:     q.type,
      role:     (isChallenger ? 'host' : 'guest') as 'host' | 'guest',
      source:   'quick' as const,
      opponent: isChallenger ? qById[q.challengedId] : qById[q.challengerId],
    };
  });

  return [...asHost, ...asGuest, ...asQuick].sort(
    (a, b) => new Date(a.when).getTime() - new Date(b.when).getTime(),
  );
}

export async function respondRequest(
  dispoPostId: string,
  reqId: string,
  userId: string,
  action: 'accept' | 'decline',
) {
  const dispo = await prisma.dispoPost.findUnique({ where: { id: dispoPostId } });
  if (!dispo)                  throw new AppError(404, 'Annonce introuvable');
  if (dispo.userId !== userId) throw new AppError(403, 'Non autorisé');

  const req = await prisma.matchRequest.findUnique({ where: { id: reqId } });
  if (!req || req.dispoPostId !== dispoPostId) throw new AppError(404, 'Demande introuvable');

  if (action === 'accept') {
    await prisma.matchRequest.updateMany({
      where: { dispoPostId, id: { not: reqId } },
      data: { status: 'declined' },
    });
  }

  const updated = await prisma.matchRequest.update({
    where: { id: reqId },
    data: { status: action === 'accept' ? 'accepted' : 'declined' },
  });

  createNotification(
    req.requesterId,
    action === 'accept' ? 'match_confirmed' : 'match_declined',
    { dispoId: dispoPostId, when: dispo!.when.toISOString(), court: dispo!.court },
  ).catch(() => {});

  return updated;
}
