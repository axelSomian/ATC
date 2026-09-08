/**
 * Débloque des hauts faits pour un membre (test / démo).
 * Les « séries » (serie_victoires, matchs_mois, sans_accroc) ne peuvent pas être
 * accordées : elles sont recalculées depuis l'historique des matchs.
 *
 * Usage : npx tsx prisma/grant-badges.ts <email> [code1,code2,...|all]
 *   ex : pnpm --filter @atc/api exec tsx prisma/grant-badges.ts moi@exemple.ci all
 *   ex : pnpm --filter @atc/api exec tsx prisma/grant-badges.ts moi@exemple.ci outsider,le_tombeur
 */
import { PrismaClient } from '@prisma/client';
import { HAUT_FAIT_CODES, BADGES } from '../src/modules/badges/badges.engine.js';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const arg = process.argv[3] ?? 'all';

  if (!email) {
    console.error('Usage : npx tsx prisma/grant-badges.ts <email> [code1,code2,...|all]');
    process.exit(1);
  }

  const codes =
    arg === 'all'
      ? [...HAUT_FAIT_CODES]
      : arg.split(',').map((c) => c.trim()).filter(Boolean);

  const invalid = codes.filter((c) => !(HAUT_FAIT_CODES as readonly string[]).includes(c));
  if (invalid.length) {
    console.error(`Codes inconnus : ${invalid.join(', ')}`);
    console.error(`Disponibles : ${HAUT_FAIT_CODES.join(', ')}`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) {
    console.error(`Aucun membre avec l'e-mail ${email}`);
    process.exit(1);
  }

  let added = 0;
  for (const code of codes) {
    try {
      await prisma.achievement.create({ data: { userId: user.id, code } });
      console.log(`  + ${code} — ${BADGES[code as keyof typeof BADGES].label}`);
      added++;
    } catch {
      console.log(`  · ${code} (déjà débloqué)`);
    }
  }

  console.log(`\n✔ ${user.name} : ${added} haut(s) fait(s) ajouté(s).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
