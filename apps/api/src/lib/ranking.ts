import { prisma } from './prisma.js';

// Classement fédéral (pivot nov. 2026) : uniquement les points de tournoi
// (TournamentResult), plus jamais l'ELO des matchs amicaux (User.rating).
// `rank` = null tant que le joueur n'a aucun point de tournoi.

export async function getUserTournamentPoints(userId: string): Promise<number> {
  const agg = await prisma.tournamentResult.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return agg._sum.points ?? 0;
}

export async function getRankByTournamentPoints(userId: string): Promise<number | null> {
  const points = await getUserTournamentPoints(userId);
  if (points <= 0) return null;

  const grouped = await prisma.tournamentResult.groupBy({
    by: ['userId'],
    _sum: { points: true },
  });
  const better = grouped.filter((g) => (g._sum.points ?? 0) > points).length;
  return better + 1;
}

/** Met à jour `bestRanking` si le classement actuel du joueur est meilleur (plus petit). */
export async function refreshBestRanking(userId: string): Promise<void> {
  const rank = await getRankByTournamentPoints(userId);
  if (rank === null) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { bestRanking: true } });
  if (!user) return;
  if (user.bestRanking === null || rank < user.bestRanking) {
    await prisma.user.update({ where: { id: userId }, data: { bestRanking: rank } });
  }
}
