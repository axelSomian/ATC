import { prisma } from '../../lib/prisma.js';
import { emitToUser } from '../../lib/socket.js';

export async function createNotification(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  const notif = await prisma.notification.create({ data: { userId, type, payload: payload as object } });
  emitToUser(userId, 'notification:new', notif);
  return notif;
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markRead(userId: string, notifId: string) {
  const n = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!n || n.userId !== userId) return null;
  return prisma.notification.update({ where: { id: notifId }, data: { readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
