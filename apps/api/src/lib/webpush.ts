import webpush from 'web-push';
import { prisma } from './prisma.js';
import { log } from './logger.js';

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
 * @returns nombre d'appareils effectivement notifiés (0 = aucun / push désactivé).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushEnabled) return 0;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  const data = JSON.stringify(payload);

  const results = await Promise.all(subs.map((s) => deliver(s, data)));
  return results.filter(Boolean).length;
}

async function deliver(
  s: { id: string; endpoint: string; p256dh: string; auth: string },
  data: string,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      data,
    );
    return true;
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) {
      await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      log.info('push.subscription.pruned', { code });
    } else {
      log.warn('push.deliver.failed', {
        code: code ?? null,
        endpoint: s.endpoint.slice(0, 60),
        detail: (err as { body?: string }).body ?? (err as Error).message,
      });
    }
    return false;
  }
}

/** Diffusion à tous les appareils abonnés (annonce admin). */
export async function sendBroadcast(
  payload: PushPayload,
): Promise<{ subscriptions: number; sent: number; failed: number }> {
  if (!pushEnabled) return { subscriptions: 0, sent: 0, failed: 0 };

  const subs = await prisma.pushSubscription.findMany();
  const data = JSON.stringify(payload);
  const BATCH = 50;
  let sent = 0;

  for (let i = 0; i < subs.length; i += BATCH) {
    const results = await Promise.all(subs.slice(i, i + BATCH).map((s) => deliver(s, data)));
    sent += results.filter(Boolean).length;
  }

  return { subscriptions: subs.length, sent, failed: subs.length - sent };
}

/** Stats d'abonnement push (panneau admin). */
export async function pushStats(): Promise<{ subscriptions: number; users: number }> {
  const [subscriptions, byUser] = await Promise.all([
    prisma.pushSubscription.count(),
    prisma.pushSubscription.groupBy({ by: ['userId'] }),
  ]);
  return { subscriptions, users: byUser.length };
}
