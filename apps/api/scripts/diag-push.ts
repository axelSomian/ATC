/**
 * Diagnostic push pour UN compte (par e-mail).
 *
 *   cd apps/api
 *   npx tsx --env-file=.env scripts/diag-push.ts guyaxelsomian@gmail.com
 *
 * Ce que ça fait :
 *   1. retrouve l'utilisateur, affiche son état (online, nb d'abonnements) ;
 *   2. liste chaque PushSubscription (service de push, âge) ;
 *   3. envoie une vraie notification de test à chaque abonnement et affiche
 *      le code de retour / le corps d'erreur renvoyé par le service de push
 *      (Apple / Google / Mozilla) — c'est là qu'on voit pourquoi ça n'arrive pas.
 *
 * Aucune donnée n'est modifiée (sauf suppression d'un abonnement mort 404/410).
 */
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:noreply@atc.ci';

function pushService(endpoint: string): string {
  try {
    const h = new URL(endpoint).host;
    if (h.includes('push.apple')) return 'Apple (iOS/Safari)';
    if (h.includes('fcm.googleapis') || h.includes('android')) return 'Google FCM (Chrome/Android)';
    if (h.includes('mozilla') || h.includes('autopush')) return 'Mozilla (Firefox)';
    if (h.includes('windows') || h.includes('notify.live')) return 'Microsoft (Edge)';
    return h;
  } catch {
    return '??';
  }
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('usage: npx tsx --env-file=.env scripts/diag-push.ts <email>');
    process.exit(1);
  }

  console.log(`\nVAPID configurée : ${Boolean(PUBLIC && PRIVATE)}  (subject=${SUBJECT})`);
  if (!PUBLIC || !PRIVATE) {
    console.error('→ VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absentes de cet environnement. Stop.');
    process.exit(1);
  }
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, online: true },
  });
  if (!user) {
    console.error(`\nAucun utilisateur avec l'e-mail ${email}`);
    process.exit(1);
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nUtilisateur : ${user.name} <${user.email}>  id=${user.id}`);
  console.log(`  online (socket) : ${user.online}`);
  console.log(`  abonnements push : ${subs.length}`);

  if (subs.length === 0) {
    console.log(`\n⚠️  ZÉRO abonnement push pour ce compte.`);
    console.log(`    → Le téléphone/navigateur n'a jamais terminé pushManager.subscribe()`);
    console.log(`      (permission refusée, PWA pas installée sur iOS, ou POST /push/subscribe en échec).`);
    console.log(`    Rien ne peut être envoyé tant que cette ligne n'existe pas.`);
    await prisma.$disconnect();
    process.exit(0);
  }

  const payload = JSON.stringify({
    title: 'ATC — test push',
    body: `Test diagnostic ${new Date().toLocaleTimeString('fr-FR')}`,
    url: '/matchs?vue=mes-matchs&tab=challenges',
    tag: 'diag',
  });

  for (const s of subs) {
    const age = Math.round((Date.now() - s.createdAt.getTime()) / 60000);
    console.log(`\n— ${pushService(s.endpoint)}`);
    console.log(`  créé il y a ${age} min   endpoint=${s.endpoint.slice(0, 70)}…`);
    try {
      const res = await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      console.log(`  ✅ accepté par le service de push — statusCode=${res.statusCode}`);
      console.log(`     (si rien ne s'affiche sur l'appareil : service worker périmé, ou`);
      console.log(`      Réglages iOS > Notifications > ATC, ou mode Concentration/Focus.)`);
    } catch (err) {
      const e = err as { statusCode?: number; body?: string; message?: string };
      console.log(`  ❌ REFUSÉ — statusCode=${e.statusCode ?? '?'}`);
      console.log(`     body: ${e.body ?? e.message}`);
      if (e.statusCode === 404 || e.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        console.log(`     → abonnement mort, supprimé de la base. L'appareil doit se réabonner.`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
