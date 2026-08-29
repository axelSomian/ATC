import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.js';

/** Clubs actifs, triés pour l'affichage, avec le nombre de membres rattachés. */
export async function listClubs() {
  const clubs = await prisma.club.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      zone: true,
      location: true,
      _count: { select: { users: true } },
    },
  });
  return clubs.map(({ _count, ...club }) => ({ ...club, memberCount: _count.users }));
}

/** Terrains actifs, triés pour l'affichage (sélecteurs + carte). */
export function listCourts() {
  return prisma.court.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, zone: true, address: true, lat: true, lng: true },
  });
}

/** Les 5 niveaux, du plus bas au plus haut. */
export function listLevels() {
  return prisma.level.findMany({
    orderBy: { level: 'asc' },
    select: { level: true, code: true, nom: true, profil: true, jeu: true },
  });
}

/** Vérifie qu'un clubId pointe vers un club actif (null/undefined = OK). */
export async function assertValidClub(clubId?: string | null): Promise<void> {
  if (!clubId) return;
  const club = await prisma.club.findFirst({ where: { id: clubId, active: true }, select: { id: true } });
  if (!club) throw new AppError(400, 'Club inconnu');
}
