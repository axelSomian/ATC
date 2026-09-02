/**
 * Copie toutes les données d'une base Postgres vers une autre (migration Neon
 * us-east-2 -> eu-central-1). Le schéma de la cible doit déjà exister
 * (`prisma migrate deploy` sur la nouvelle base au préalable).
 *
 *   SRC_URL=<ancienne DIRECT_URL> DST_URL=<nouvelle DIRECT_URL> \
 *     npx tsx apps/api/scripts/copy-db.ts [--wipe] [--delta ISO_DATE]
 *
 *   --wipe          vide les tables de la cible avant copie (copie complète)
 *   --delta <date>  ne copie que les lignes créées après <date> (resync de coupure ;
 *                   ne touche qu'aux tables horodatées : Message, Notification,
 *                   Match, QuickMatch, DispoPost, MatchRequest, Conversation,
 *                   ConversationParticipant, User)
 */
import { PrismaClient } from '@prisma/client';

const SRC = process.env.SRC_URL;
const DST = process.env.DST_URL;
if (!SRC || !DST) throw new Error('SRC_URL et DST_URL requis');

const wipe = process.argv.includes('--wipe');
const deltaArg = process.argv.indexOf('--delta');
const delta = deltaArg !== -1 ? new Date(process.argv[deltaArg + 1]) : null;

const src = new PrismaClient({ datasources: { db: { url: SRC } } });
const dst = new PrismaClient({ datasources: { db: { url: DST } } });

// Ordre de dépendance (parents avant enfants).
const ORDER = [
  'level', 'club', 'user', 'dispoPost', 'matchRequest',
  'quickMatch', 'match', 'notification',
  'conversation', 'conversationParticipant', 'message',
] as const;

// Colonne d'horodatage pour le mode --delta (null = table non resyncable en delta).
const TS: Record<string, string | null> = {
  level: null, club: 'createdAt', user: 'joinedAt', dispoPost: 'createdAt',
  matchRequest: null, quickMatch: 'createdAt', match: 'playedAt',
  notification: 'createdAt', conversation: 'createdAt',
  conversationParticipant: null, message: 'createdAt',
};

async function main() {
  if (wipe) {
    for (const m of [...ORDER].reverse()) {
      // @ts-expect-error dynamic
      const n = await dst[m].deleteMany({});
      console.log(`wipe ${m}: ${n.count}`);
    }
  }

  for (const m of ORDER) {
    const where = delta && TS[m] ? { [TS[m] as string]: { gt: delta } } : {};
    if (delta && !TS[m]) { console.log(`skip ${m} (pas de delta)`); continue; }

    // @ts-expect-error dynamic
    const rows: unknown[] = await src[m].findMany({ where });
    if (rows.length === 0) { console.log(`${m}: 0`); continue; }

    // @ts-expect-error dynamic
    const res = await dst[m].createMany({ data: rows, skipDuplicates: true });
    console.log(`${m}: ${res.count}/${rows.length}`);
  }

  console.log('\n--- comptage cible ---');
  for (const m of ORDER) {
    // @ts-expect-error dynamic
    console.log(`${m}: ${await dst[m].count()}`);
  }

  await src.$disconnect();
  await dst.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
