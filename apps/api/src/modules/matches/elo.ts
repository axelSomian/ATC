// Tout le monde démarre au même rating — le niveau déclaré n'avantage personne.
// Le niveau réel ne bouge qu'après MIN_GAMES_TO_MOVE_LEVEL matchs confirmés
// (politique appliquée par `applyEloUpdate`, qui ne touche pas `level` avant ça).
const INITIAL_RATING = 1000;
export const MIN_GAMES_TO_MOVE_LEVEL = 5;

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

export interface EloResult {
  newRating: number;
  newLevel:  number;
  delta:     number;
}

export function computeElo(
  myRating:   number,
  myGames:    number,
  oppRating:  number,
  won:        boolean,
): EloResult {
  const e        = expected(myRating, oppRating);
  const s        = won ? 1 : 0;
  const delta    = Math.round(kFactor(myGames) * (s - e));
  const newRating = clamp(myRating + delta, 600, 2000);
  // Niveau = pure fonction du rating. Le « quand l'appliquer » (seuil des
  // MIN_GAMES_TO_MOVE_LEVEL matchs) est géré par l'appelant.
  const newLevel  = ratingToLevel(newRating);
  return { newRating, newLevel, delta };
}
