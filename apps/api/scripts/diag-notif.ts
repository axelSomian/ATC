/**
 * Compare deux chemins de push pour un compte :
 *   A) push DIRECT (comme la messagerie)            -> sendPushToUser()
 *   B) via createNotification("<type>")             -> le chemin des défis / demandes / scores
 *
 *   cd apps/api
 *   npx tsx --env-file=.env scripts/diag-notif.ts guyaxelsomian@gmail.com quick_match_request
 *
 * Chaque push porte un titre distinct ("A —" / "B —") : sur le téléphone on voit
 * immédiatement lequel des deux arrive.
 */
import { PrismaClient } from '@prisma/client';
import { sendPushToUser } from '../src/lib/webpush.js';
import { createNotification } from '../src/modules/notifications/notifications.service.js';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const type = process.argv[3] ?? 'quick_match_request';
  if (!email) {
    console.error('usage: npx tsx --env-file=.env scripts/diag-notif.ts <email> [type]');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) { console.error(`Aucun utilisateur ${email}`); process.exit(1); }
  console.log(`\nCible : ${user.name} (${user.id})`);

  // ── A) push direct ────────────────────────────────────────────────────────
  const a = await sendPushToUser(user.id, {
    title: 'A — push direct',
    body: `Test direct ${new Date().toLocaleTimeString('fr-FR')}`,
    url: '/matchs',
    tag: 'diag-a',
  });
  console.log(`A) sendPushToUser direct         -> ${a} appareil(s) notifié(s)`);

  // ── B) via createNotification (chemin réel des défis) ─────────────────────
  const payload: Record<string, unknown> = {
    quickMatchId: 'diag-' + Date.now(),
    challengerId: 'diag',
    challengerName: 'Joueur Test',
    requesterName: 'Joueur Test',
    when: new Date().toISOString(),
    court: 'Court Test',
    type: 'simple',
  };
  const notif = await createNotification(user.id, type, payload);
  console.log(`B) createNotification("${type}")  -> Notification ${notif.id} créée`);

  // laisser partir le push fire-and-forget de createNotification
  await new Promise((r) => setTimeout(r, 4000));
  await prisma.notification.delete({ where: { id: notif.id } }).catch(() => {});
  console.log('   (ligne de test supprimée)');

  console.log('\n→ Sur le téléphone : "A —" ET "B —" doivent arriver.');
  console.log('  A seul  = createNotification ne pousse pas (bug pushContent / type inconnu).');
  console.log('  Les deux = le code est bon ; le vrai défi doit marcher aussi.');

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
