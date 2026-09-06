// Tout le monde démarre au même rating — le niveau déclaré n'avantage personne.
// Le niveau réel ne bouge qu'après MIN_GAMES_TO_MOVE_LEVEL matchs confirmés
// (politique appliquée par `applyEloUpdate`, qui ne touche pas `level` avant ça).
const INITIAL_RATING = 1000;
export const MIN_GAMES_TO_MOVE_LEVEL = 5;

// ── Marge du score (margin of victory) ───────────────────────────────────────
// L'ajustement ELO de base ne connaît que le vainqueur (S = 0 ou 1). On module
// ce delta par un facteur ∈ [1, MOV_MAX] : un match serré compte ≈ 1× (une
// victoire reste une victoire), une correction jusqu'à MOV_MAX×. Le même facteur
// est appliqué aux DEUX joueurs → la somme reste quasi nulle.
// MOV_SLOPE = 0 → désactive complètement la marge (retour au comportement d'avant).
export const MOV_SLOPE = 0.4;
export const MOV_MAX   = 1.4;

function kFactor(games: number): number {
  if (games < 10) return 40;
  if (games < 30) return 25;
  return 15;
}

function expected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function initialRating(_level: number): number {
  return INITIAL_RATING;
}

export function ratingToLevel(rating: number): number {
  if (rating < 900)  return 1;
  if (rating < 1100) return 2;
  if (rating < 1300) return 3;
  if (rating < 1500) return 4;
  return 5;
}

/**
 * Somme des jeux `[hôte, invité]` à partir d'un score type `"6-4 7-5"`.
 * Sépare sur les espaces ou virgules ; ignore les fragments non `n-n`
 * (ex. une éventuelle annotation de tie-break). `null` si rien d'exploitable.
 */
export function gamesFromScore(score: string): [number, number] | null {
  let host = 0;
  let guest = 0;
  let parsed = false;
  for (const set of score.trim().split(/[\s,]+/)) {
    // `n-n`, avec une annotation de tie-break optionnelle « (n) » tolérée.
    const m = /^(\d{1,2})-(\d{1,2})(?:\(\d+\))?$/.exec(set);
    if (!m) continue;
    host  += Number(m[1]);
    guest += Number(m[2]);
    parsed = true;
  }
  return parsed ? [host, guest] : null;
}

/**
 * Facteur de marge ∈ [1, MOV_MAX].
 * `dominance` = écart de jeux rapporté au total → 6-0 6-0 ≈ 1, 7-6 7-6 ≈ 0.
 * Un score « à l'envers » (perdant avec plus de jeux, ex. abandon) retombe à 1.
 */
export function movMultiplier(winnerGames: number, loserGames: number): number {
  const total = winnerGames + loserGames;
  if (total <= 0) return 1;
  const dominance = Math.max(0, winnerGames - loserGames) / total;
  return clamp(1 + dominance * MOV_SLOPE, 1, MOV_MAX);
}

/** Facteur de marge directement à partir du score brut (`scoreHost` suffit). */
export function movFromScore(scoreHost: string, hostWon: boolean): number {
  const games = gamesFromScore(scoreHost);
  if (!games) return 1;
  const [host, guest] = games;
  return hostWon ? movMultiplier(host, guest) : movMultiplier(guest, host);
}

export interface EloResult {
  newRating: number;
  newLevel:  number;
  delta:     number;
}

// ── Enjeu d'un match à venir (affichage motivant, côté joueur courant) ────────
// On ne montre jamais le rating brut : seulement une probabilité, les points en
// jeu, et une « bande » qualitative qui pilote le ton du message.

export type StakesBand = 'outsider' | 'balanced' | 'favorite';

export interface MatchStakes {
  /** Probabilité de victoire du joueur courant (0–1, arrondie au centième). */
  probability: number;
  /** Points gagnés en cas de victoire (marge neutre). */
  deltaWin:  number;
  /** Points perdus en cas de défaite (valeur négative). */
  deltaLoss: number;
  band: StakesBand;
}

/** Probabilité de victoire brute (fonction pure du couple de ratings). */
export function winProbability(myRating: number, oppRating: number): number {
  return expected(myRating, oppRating);
}

/**
 * Enjeu d'un match pour le joueur courant. `mov` neutre (le score est inconnu
 * avant le match). Bandes : < 40 % → outsider, 40–60 % → équilibré, > 60 % → favori.
 */
export function matchStakes(
  myRating: number,
  myGames:  number,
  oppRating: number,
): MatchStakes {
  const p = expected(myRating, oppRating);
  const band: StakesBand = p < 0.4 ? 'outsider' : p > 0.6 ? 'favorite' : 'balanced';
  return {
    probability: Math.round(p * 100) / 100,
    deltaWin:  computeElo(myRating, myGames, oppRating, true).delta,
    deltaLoss: computeElo(myRating, myGames, oppRating, false).delta,
    band,
  };
}

export function computeElo(
  myRating:   number,
  myGames:    number,
  oppRating:  number,
  won:        boolean,
  mov:        number = 1,
): EloResult {
  const e        = expected(myRating, oppRating);
  const s        = won ? 1 : 0;
  const delta    = Math.round(kFactor(myGames) * (s - e) * mov);
  const newRating = clamp(myRating + delta, 600, 2000);
  // Niveau = pure fonction du rating. Le « quand l'appliquer » (seuil des
  // MIN_GAMES_TO_MOVE_LEVEL matchs) est géré par l'appelant.
  const newLevel  = ratingToLevel(newRating);
  return { newRating, newLevel, delta };
}
