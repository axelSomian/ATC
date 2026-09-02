import webpush from 'web-push';
import { prisma } from './prisma.js';

const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:noreply@atc.ci';

export const pushEnabled = Boolean(PUBLIC && PRIVATE);
export const vapidPublicKey = PUBLIC ?? '';

if (pushEnabled) {
  webpush.setVapidDetails(SUBJECT, PUBLIC as string, PRIVATE as string);
} else if (process.env.NODE_ENV === 'production') {
  console.warn('[webpush] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes — notifications push désactivées');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Envoie une notification push à tous les appareils enregistrés d'un utilisateur.
 * Nettoie au passage les abonnements morts (404/410).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }),
  );
}
