import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';
import { createNotification } from '../notifications/notifications.service.js';
import type { CreateQuickMatchDto } from './quick-matches.schema.js';

const USER_SEL = { id: true, name: true, initials: true, avatarUrl: true, level: true } as const;

export async function challenge(challengerId: string, dto: CreateQuickMatchDto) {
  if (challengerId === dto.challengedId) {
    throw new AppError(400, 'Vous ne pouvez pas vous défier vous-même');
  }

  const challenged = await prisma.user.findUnique({ where: { id: dto.challengedId }, select: USER_SEL });
  if (!challenged) throw new AppError(404, 'Membre introuvable');

  const challenger = await prisma.user.findUnique({ where: { id: challengerId }, select: USER_SEL });

  const qm = await prisma.quickMatch.create({
    data: {
      challengerId,
      challengedId: dto.challengedId,
      when:  new Date(dto.when),
      court: dto.court,
      type:  dto.type,
      note:  dto.note ?? null,
    },
  });

  createNotification(dto.challengedId, 'quick_match_request', {
    quickMatchId:   qm.id,
    challengerId,
    challengerName: challenger?.name ?? 'Un joueur',
    when:  qm.when.toISOString(),
    court: qm.court,
    type:  qm.type,
  }).catch(() => {});

  return qm;
}

export async function respond(quickMatchId: string, userId: string, action: 'accept' | 'decline') {
  const qm = await prisma.quickMatch.findUnique({ where: { id: quickMatchId } });
  if (!qm)                    throw new AppError(404, 'Match rapide introuvable');
  if (qm.challengedId !== userId) throw new AppError(403, 'Non autorisé');
  if (qm.status !== 'pending')    throw new AppError(409, 'Demande déjà traitée');

  const updated = await prisma.quickMatch.update({
    where: { id: quickMatchId },
    data: { status: action === 'accept' ? 'accepted' : 'declined' },
  });

  createNotification(qm.challengerId, action === 'accept' ? 'match_confirmed' : 'match_declined', {
    quickMatchId,
    when:  qm.when.toISOString(),
    court: qm.court,
  }).catch(() => {});

  return updated;
}

export async function getMyQuickMatches(userId: string) {
  const qms = await prisma.quickMatch.findMany({
    where: {
      OR: [{ challengerId: userId }, { challengedId: userId }],
      status: { in: ['pending', 'accepted'] },
    },
    orderBy: { when: 'asc' },
  });

  const userIds = [...new Set(qms.flatMap(q => [q.challengerId, q.challengedId]))];
  const users   = await prisma.user.findMany({ where: { id: { in: userIds } }, select: USER_SEL });
  const byId    = Object.fromEntries(users.map(u => [u.id, u]));

  return qms.map(q => ({
    ...q,
    challenger: byId[q.challengerId],
    challenged: byId[q.challengedId],
  }));
}
