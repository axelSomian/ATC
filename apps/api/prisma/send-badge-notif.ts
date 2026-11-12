/**
 * Envoie une notification « badge débloqué » à un membre (test).
 * Crée la ligne Notification + déclenche le Web Push sur ses appareils.
 *
 * Usage : node --env-file=apps/api/.env --import tsx apps/api/prisma/send-badge-notif.ts <email> [code]
 *   ex : … send-badge-notif.ts guyaxelsomian@gmail.com outsider
 */
import { PrismaClient } from '@prisma/client';
import { createNotification } from '../src/modules/notifications/notifications.service.js';
import { BADGES } from '../src/modules/badges/badges.engine.js';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const code = process.argv[3] ?? 'outsider';

  if (!email || !(code in BADGES)) {
    console.error(`Usage : … send-badge-notif.ts <email> [code]`);
    console.error(`Codes : ${Object.keys(BADGES).join(', ')}`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) {
    console.error(`Aucun membre avec l'e-mail ${email}`);
    process.exit(1);
  }

  const meta = BADGES[code as keyof typeof BADGES];
  await createNotification(user.id, 'badge_unlocked', {
    code,
    label: meta.label,
    description: meta.description,
  });

  // Le push part en fire-and-forget dans createNotification — on laisse le temps
  // aux requêtes HTTP vers les navigateurs d'aboutir avant de couper le process.
  await new Promise((r) => setTimeout(r, 4000));

  console.log(`✔ Notif « ${meta.label} » envoyée à ${user.name}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
