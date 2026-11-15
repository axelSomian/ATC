// Règles du classement fédéral façon ATP (décisions PO du 2026-11-14).
// Fonctions pures, sans accès base — testées dans __tests__/ranking.rules.test.ts.
//
//   points = barème du tour atteint × base du niveau × coefficient de catégorie
//   classement = somme des 6 meilleurs résultats des 12 derniers mois
//   montée = 2 tournois gagnés à son niveau ou au-dessus (12 mois),
//            ou 1 tournoi gagné à un niveau supérieur → passe à ce niveau.

export const TOURNAMENT_CATEGORIES = ['club', 'challenger', 'open', 'grand_chelem'] as const;
export type TournamentCategory = (typeof TOURNAMENT_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<TournamentCategory, string> = {
  club: 'Club',
  challenger: 'Challenger',
  open: 'Open',
  grand_chelem: 'Grand Chelem',
};

export const CATEGORY_COEF: Record<TournamentCategory, number> = {
  club: 1,
  challenger: 1.5,
  open: 2,
  grand_chelem: 3,
};

/** Nombre minimum d'inscrits pour tirer le tableau — un petit tableau ne vaut pas un grand. */
export const CATEGORY_MIN_PLAYERS: Record<TournamentCategory, number> = {
  club: 4,
  challenger: 8,
  open: 16,
  grand_chelem: 32,
};

/** Points du vainqueur d'un tournoi « Club », par niveau du tournoi. */
export const LEVEL_BASE_POINTS: Record<number, number> = { 1: 60, 2: 120, 3: 250, 4: 500, 5: 1000 };

export const BEST_RESULTS_COUNT = 6;
export const POINTS_VALIDITY_DAYS = 365;
export const WINS_TO_LEVEL_UP = 2;
export const MAX_LEVEL = 5;

export function isTournamentCategory(v: string): v is TournamentCategory {
  return (TOURNAMENT_CATEGORIES as readonly string[]).includes(v);
}

export function categoryOf(v: string | null | undefined): TournamentCategory {
  return v && isTournamentCategory(v) ? v : 'club';
}

/** Niveau qui compte pour les points et la montée : le niveau du tournoi, ou N5 s'il est open. */
export function tournamentLevel(maxLevel: number | null | undefined): number {
  return maxLevel ?? MAX_LEVEL;
}

/**
 * Part des points du vainqueur selon le tour atteint.
 * Vainqueur 100 %, finaliste 60 %, demi-finaliste 36 %, puis moitié à chaque tour plus tôt.
 * `roundReached` = tour où le joueur a perdu (la finale pour le vainqueur).
 */
export function roundShare(roundReached: number, totalRounds: number, isChampion: boolean): number {
  if (isChampion) return 1;
  const distance = totalRounds - roundReached; // 0 = finale, 1 = demie, ...
  if (distance <= 0) return 0.6;
  return 0.36 / 2 ** (distance - 1);
}

/** Points gagnés pour un résultat. Minimum 1 point : participer rapporte toujours quelque chose. */
export function resultPoints(params: {
  level: number;
  category: TournamentCategory;
  roundReached: number;
  totalRounds: number;
  isChampion: boolean;
}): number {
  const base = LEVEL_BASE_POINTS[params.level] ?? LEVEL_BASE_POINTS[MAX_LEVEL];
  const raw = base * CATEGORY_COEF[params.category] * roundShare(params.roundReached, params.totalRounds, params.isChampion);
  return Math.max(1, Math.round(raw));
}

/** Barème complet d'un tournoi (vainqueur puis chaque tour) — pour afficher les « points en jeu ». */
export function pointsTable(level: number, category: TournamentCategory, totalRounds: number) {
  const rows: { roundReached: number; isChampion: boolean; points: number }[] = [
    { roundReached: totalRounds, isChampion: true, points: resultPoints({ level, category, roundReached: totalRounds, totalRounds, isChampion: true }) },
  ];
  for (let r = totalRounds; r >= 1; r--) {
    rows.push({ roundReached: r, isChampion: false, points: resultPoints({ level, category, roundReached: r, totalRounds, isChampion: false }) });
  }
  return rows;
}

/* ─────────────────────────── Tableau → résultats ─────────────────────────── */

export interface BracketMatchLike {
  round: number;
  playerAId: string | null;
  playerBId: string | null;
  winnerId: string | null;
}

export interface ComputedResult {
  userId: string;
  roundReached: number;
  isChampion: boolean;
  position: number; // 1 vainqueur, 2 finaliste, 3 demi-finalistes, 5 quarts, 9, ...
}

/**
 * Déduit le tour atteint par chaque joueur d'un tableau terminé.
 * null si la finale n'a pas encore de vainqueur (tournoi pas fini).
 * Un bye n'est pas un match : un joueur qualifié d'office au 1er tour qui perd
 * au 2e est éliminé au 2e tour.
 */
export function resultsFromBracket(matches: BracketMatchLike[]): ComputedResult[] | null {
  if (matches.length === 0) return null;
  const totalRounds = Math.max(...matches.map((m) => m.round));
  const final = matches.find((m) => m.round === totalRounds);
  if (!final?.winnerId) return null;

  const reached = new Map<string, number>();
  for (const m of matches) {
    for (const id of [m.playerAId, m.playerBId]) {
      if (!id) continue;
      reached.set(id, Math.max(reached.get(id) ?? 0, m.round));
    }
  }

  return [...reached.entries()].map(([userId, roundReached]) => {
    const isChampion = userId === final.winnerId;
    const distance = totalRounds - roundReached;
    const position = isChampion ? 1 : distance === 0 ? 2 : 2 ** distance + 1;
    return { userId, roundReached, isChampion, position };
  });
}

/* ─────────────────────────── Classement ─────────────────────────── */

export function validityCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - POINTS_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

export interface ResultLike {
  points: number;
  earnedAt: Date;
}

/** Résultats retenus pour le classement : non expirés, les N meilleurs. */
export function countedResults<T extends ResultLike>(results: T[], now: Date = new Date()): T[] {
  const cutoff = validityCutoff(now);
  return results
    .filter((r) => r.earnedAt >= cutoff)
    .sort((a, b) => b.points - a.points || b.earnedAt.getTime() - a.earnedAt.getTime())
    .slice(0, BEST_RESULTS_COUNT);
}

export function rankingTotal(results: ResultLike[], now: Date = new Date()): number {
  return countedResults(results, now).reduce((sum, r) => sum + r.points, 0);
}

/** Date à laquelle un résultat expire (12 mois après `earnedAt`). */
export function expiresAt(earnedAt: Date): Date {
  return new Date(earnedAt.getTime() + POINTS_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

/* ─────────────────────────── Montée de niveau ─────────────────────────── */

export interface WinLike {
  tournamentId: string;
  level: number;
  earnedAt: Date;
}

/**
 * Niveau cible après les victoires d'un joueur, ou null s'il ne monte pas.
 * - une victoire à un niveau supérieur → monte directement à ce niveau ;
 * - sinon 2 victoires à son niveau (ou au-dessus) dans les 12 mois → +1.
 * `consumed` = victoires ayant déjà servi à une montée précédente (non recomptées).
 */
export function levelUpTarget(
  currentLevel: number,
  wins: WinLike[],
  consumed: ReadonlySet<string>,
  now: Date = new Date(),
): { toLevel: number; tournamentIds: string[] } | null {
  if (currentLevel >= MAX_LEVEL) return null;
  const cutoff = validityCutoff(now);
  const eligible = wins.filter((w) => w.earnedAt >= cutoff && w.level >= currentLevel && !consumed.has(w.tournamentId));

  const above = eligible.filter((w) => w.level > currentLevel);
  if (above.length > 0) {
    const best = above.reduce((a, b) => (b.level > a.level ? b : a));
    return { toLevel: Math.min(best.level, MAX_LEVEL), tournamentIds: [best.tournamentId] };
  }

  if (eligible.length >= WINS_TO_LEVEL_UP) {
    const used = eligible
      .sort((a, b) => a.earnedAt.getTime() - b.earnedAt.getTime())
      .slice(0, WINS_TO_LEVEL_UP)
      .map((w) => w.tournamentId);
    return { toLevel: currentLevel + 1, tournamentIds: used };
  }
  return null;
}
