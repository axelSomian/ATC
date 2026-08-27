/**
 * Promeut (ou rétrograde) un membre.
 * Usage : npx tsx prisma/set-role.ts <email> [admin|member]
 *   ex : pnpm --filter @atc/api exec tsx prisma/set-role.ts moi@exemple.ci admin
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const role = process.argv[3] ?? 'admin';

  if (!email || (role !== 'admin' && role !== 'member')) {
    console.error('Usage : npx tsx prisma/set-role.ts <email> [admin|member]');
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role },
    select: { email: true, name: true, role: true },
  });

  console.log(`✔ ${user.name} <${user.email}> → ${user.role}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
