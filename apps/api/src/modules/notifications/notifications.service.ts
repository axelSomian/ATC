import { prisma } from '../../lib/prisma.js';
import { emitToUser } from '../../lib/socket.js';
import { sendPushToUser } from '../../lib/webpush.js';

const MATCHS = '/matchs';

/** Texte + lien du push pour chaque type de notification (miroir de NotificationsService.label côté front). */
function pushContent(type: string, p: Record<string, unknown>): { title: string; body: string; url: string } | null {
  const name = (p['requesterName'] ?? p['challengerName']) as string | undefined;
  switch (type) {
    case 'match_request':
      return { title: 'Nouvelle demande de match', body: `${name ?? 'Un joueur'} veut rejoindre votre match`, url: `${MATCHS}?vue=trouver&tab=mine` };
    case 'match_confirmed':
      return { title: 'Match confirmé', body: 'Votre demande a été acceptée', url: `${MATCHS}?vue=mes-matchs&tab=upcoming` };
    case 'match_declined':
      return { title: 'Demande refusée', body: "Votre demande n'a pas été retenue", url: `${MATCHS}?vue=trouver&tab=mine` };
    case 'quick_match_request':
      return { title: 'Nouveau défi', body: `${name ?? 'Un joueur'} vous défie à un match`, url: `${MATCHS}?vue=mes-matchs&tab=challenges` };
    case 'score_to_validate':
      return { title: 'Score à valider', body: 'Votre adversaire a saisi le score de votre match', url: `${MATCHS}?vue=mes-matchs&tab=history` };
    case 'score_confirmed':
      return { title: 'Score confirmé', body: 'Le score de votre match est confirmé', url: `${MATCHS}?vue=mes-matchs&tab=history` };
    case 'score_disputed':
      return { title: 'Score contesté', body: 'Le score de votre match a été contesté', url: `${MATCHS}?vue=mes-matchs&tab=history` };
    case 'score_resolved':
      return { title: 'Litige tranché', body: 'Un administrateur a tranché le litige de votre match', url: `${MATCHS}?vue=mes-matchs&tab=history` };
    default:
      return null;
  }
}

export async function createNotification(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  const notif = await prisma.notification.create({ data: { userId, type, payload: payload as object } });
  emitToUser(userId, 'notification:new', notif);

  const c = pushContent(type, payload);
  if (c) {
    const ref = payload['dispoId'] ?? payload['quickMatchId'] ?? payload['matchId'] ?? '';
    sendPushToUser(userId, { ...c, tag: `notif:${type}:${ref}` }).catch(() => {});
  }

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
