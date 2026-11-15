// Tirage au sort avec têtes de série (décision PO du 2026-11-14).
// Fonctions pures — testées dans __tests__/draw.rules.test.ts.
//
// - Têtes de série : 1 pour 4 places du tableau (tableau de 8 → 2, 16 → 4, 32 → 8),
//   ordonnées par points au classement puis par niveau.
// - Placement standard : la n°1 en haut, la n°2 en bas (ne se croisent qu'en
//   finale), n°3/n°4 dans des moitiés différentes, etc.
// - Les byes vont aux mieux classés (têtes de série d'abord, puis les suivants).
// - Le reste du tableau est tiré au hasard.

export interface DrawPlayer {
  userId: string;
  points: number; // points au classement (6 meilleurs / 12 mois), 0 si non classé
  level: number;
}

export interface DrawResult {
  size: number;
  /** positions[i] = userId à la place i du 1er tour (null = bye). Match k = places 2k et 2k+1. */
  positions: (string | null)[];
  /** userId → numéro de tête de série. */
  seeds: Map<string, number>;
}

export function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/** Nombre de têtes de série pour un tableau de `size` places. */
export function seedCount(size: number): number {
  return size >= 4 ? size / 4 : 0;
}

/**
 * Ordre standard d'un tableau : `order[place] = rang` (1 = meilleur).
 * Au 1er tour, le rang r affronte le rang size+1-r.
 * size 8 → [1, 8, 4, 5, 2, 7, 3, 6].
 */
export function standardOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((r) => [r, n + 1 - r]);
  }
  return order;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Classement des joueurs pour le tirage : points, puis niveau, puis hasard. */
export function rankForDraw(players: DrawPlayer[], rng: () => number = Math.random): DrawPlayer[] {
  return shuffle(players, rng).sort((a, b) => b.points - a.points || b.level - a.level);
}

export function buildDraw(players: DrawPlayer[], rng: () => number = Math.random): DrawResult {
  const n = players.length;
  const size = nextPowerOfTwo(n);
  const ranked = rankForDraw(players, rng);
  const byes = size - n;
  const seeded = Math.min(seedCount(size), n);
  // Places fixées par le rang : les têtes de série, et tous ceux qui reçoivent un bye.
  const fixed = Math.max(seeded, byes);

  const order = standardOrder(size);
  const positions: (string | null)[] = new Array(size).fill(null);
  const freePlaces: number[] = [];
  order.forEach((rank, place) => {
    if (rank <= fixed) positions[place] = ranked[rank - 1].userId;
    else if (rank > n) positions[place] = null; // bye (face à un des `byes` mieux classés)
    else freePlaces.push(place);
  });

  const rest = shuffle(ranked.slice(fixed), rng);
  freePlaces.forEach((place, i) => { positions[place] = rest[i].userId; });

  const seeds = new Map<string, number>();
  ranked.slice(0, seeded).forEach((p, i) => seeds.set(p.userId, i + 1));
  return { size, positions, seeds };
}
