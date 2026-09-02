/**
 * Vide la base de TOUT sauf les tables de référence (Club, Level).
 *
 *   DST_URL=<URL directe de la base> npx tsx apps/api/scripts/wipe-db.ts        # dry-run
 *   DST_URL=<URL directe de la base> npx tsx apps/api/scripts/wipe-db.ts --yes  # exécute
 *
 * Supprime tous les User (dont les admins) → il faudra recréer un compte et le
 * promouvoir (prisma/set-role.ts) pour retrouver l'accès à /admin.
 * L'historique des migrations (_prisma_migrations) n'est pas touché.
 */
import { PrismaClient } from '@prisma/client';

const DST = process.env.DST_URL;
if (!DST) throw new Error('DST_URL requis (URL directe de la base)');

const apply = process.argv.includes('--yes');
const prisma = new PrismaClient({ datasources: { db: { url: DST } } });

// Enfants avant parents (contraintes FK). Club et Level sont volontairement absents.
const ORDER = [
  'message',
  'conversationParticipant',
  'conversation',
  'notification',
  'match',
  'quickMatch',
  'matchRequest',
  'dispoPost',
  'user',
] as const;

async function count(model: string): Promise<number> {
  // @ts-expect-error accès dynamique
  return prisma[model].count();
}

async function main() {
  console.log(apply ? 'MODE EXÉCUTION\n' : 'DRY-RUN (rien supprimé) — relance avec --yes\n');

  for (const model of ORDER) {
    const before = await count(model);
    if (apply) {
      // @ts-expect-error accès dynamique
      await prisma[model].deleteMany({});
      console.log(`  ${model}: -${before}`);
    } else {
      console.log(`  ${model}: ${before} à supprimer`);
    }
  }

  console.log('\n--- comptage final ---');
  for (const model of ['club', 'level', ...ORDER]) {
    console.log(`  ${model}: ${await count(model)}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
