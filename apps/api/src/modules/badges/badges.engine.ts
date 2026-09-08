// Moteur de calcul des badges — fonctions pures, aucune dépendance Prisma.
// Deux familles :
//   • séries  → compteurs vivants, recalculés à la lecture, jamais stockés
//   • hauts faits → permanents, persistés dans la table Achievement (insert-only)
//
// Décisions produit figées (cf. mémoire "badges") :
//   - une série ne "compte" qu'à partir de 5 (serie_victoires) et exige des
//     adversaires distincts pour ne pas récompenser le farming ;
//   - S1 / S3 vivent en continu, S2 se remet à zéro le 1er du mois ;
//   - les matchs auto-validés (silence 72 h) comptent comme les autres ;
//   - pas de rétroactif : un match sans contexte figé (ratings d'avant la
//     feature) ne peut pas débloquer outsider / le_tombeur / le déclic.

import { ratingToLevel, winProbability } from '../matches/elo.js';

export type BadgeKind = 'serie' | 'haut_fait';

export interface BadgeMeta {
  code: string;
  kind: BadgeKind;
  label: string;
  description: string;
}

export const SERIE_CODES = ['serie_victoires', 'matchs_mois', 'sans_accroc'] as const;

export const HAUT_FAIT_CODES = [
  'premier_match',
  'premiere_victoire_plus_fort',
  'outsider',
  'vingt_adversaires',
  'passage_niveau',
  'veteran',
  'toujours_partant',
  'le_tombeur',
  'remontada',
  'fidele_club',
] as const;

export type SerieCode = (typeof SERIE_CODES)[number];
export type HautFaitCode = (typeof HAUT_FAIT_CODES)[number];
export type BadgeCode = SerieCode | HautFaitCode;

export const BADGES: Record<BadgeCode, BadgeMeta> = {
  serie_victoires: {
    code: 'serie_victoires',
    kind: 'serie',
    label: 'Série de victoires',
    description: "5 victoires d'affilée ou plus, contre des adversaires différents.",
  },
  matchs_mois: {
    code: 'matchs_mois',
    kind: 'serie',
    label: 'Actif ce mois-ci',
    description: 'Au moins 4 matchs joués dans le mois.',
  },
  sans_accroc: {
    code: 'sans_accroc',
    kind: 'serie',
    label: 'Sans accroc',
    description: "10 matchs d'affilée validés sans le moindre litige.",
  },
  premier_match: {
    code: 'premier_match',
    kind: 'haut_fait',
    label: 'Premier match',
    description: 'Ton premier match validé sur ATC.',
  },
  premiere_victoire_plus_fort: {
    code: 'premiere_victoire_plus_fort',
    kind: 'haut_fait',
    label: 'Le déclic',
    description: "Une première victoire contre un joueur d'un niveau supérieur.",
  },
  outsider: {
    code: 'outsider',
    kind: 'haut_fait',
    label: 'Outsider',
    description: 'Gagner un match où tout le monde te donnait perdant.',
  },
  vingt_adversaires: {
    code: 'vingt_adversaires',
    kind: 'haut_fait',
    label: "Cercle qui s'agrandit",
    description: '20 adversaires différents affrontés.',
  },
  passage_niveau: {
    code: 'passage_niveau',
    kind: 'haut_fait',
    label: 'Palier franchi',
    description: 'Passer un niveau grâce à tes résultats.',
  },
  veteran: {
    code: 'veteran',
    kind: 'haut_fait',
    label: 'Vétéran',
    description: '25 matchs validés au compteur.',
  },
  toujours_partant: {
    code: 'toujours_partant',
    kind: 'haut_fait',
    label: 'Toujours partant',
    description: '10 défis acceptés et menés jusqu\'au bout.',
  },
  le_tombeur: {
    code: 'le_tombeur',
    kind: 'haut_fait',
    label: 'Le tombeur',
    description: 'Battre un joueur classé deux niveaux au-dessus.',
  },
  remontada: {
    code: 'remontada',
    kind: 'haut_fait',
    label: 'Remontada',
    description: 'Gagner un match après avoir perdu la première manche.',
  },
  fidele_club: {
    code: 'fidele_club',
    kind: 'haut_fait',
    label: 'Fidèle au club',
    description: '10 matchs joués dans le même club.',
  },
};

// Seuils des séries.
export const SERIE_TARGETS: Record<SerieCode, number> = {
  serie_victoires: 5,
  matchs_mois: 4,
  sans_accroc: 10,
};
/** Adversaires distincts minimum dans une série de victoires pour la valider. */
export const SERIE_VICTOIRES_MIN_DISTINCT = 3;
export const VINGT_ADVERSAIRES_TARGET = 20;
export const VETERAN_TARGET = 25;
export const TOUJOURS_PARTANT_TARGET = 10;
export const FIDELE_CLUB_TARGET = 10;
/** Probabilité de victoire au-dessus de laquelle on n'est plus « outsider ». */
export const OUTSIDER_MAX_PROBABILITY = 0.4;

/** Un match confirmé, normalisé pour le moteur (score `scoreHost` côté hôte). */
export interface EngineMatch {
  id: string;
  playedAt: Date;
  hostId: string;
  guestId: string;
  winnerId: string;
  scoreHost: string;
  court: string;
  wasDisputed: boolean;
  hostRatingBefore: number | null;
  guestRatingBefore: number | null;
}

export interface SerieResult {
  code: SerieCode;
  value: number;
  target: number;
  earned: boolean;
}

export interface EarnedAchievement {
  code: HautFaitCode;
  context?: Record<string, unknown>;
}

export interface BadgeComputation {
  series: SerieResult[];
  achievements: EarnedAchievement[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function opponentId(m: EngineMatch, userId: string): string {
  return m.hostId === userId ? m.guestId : m.hostId;
}

/** Ratings figés du point de vue de `userId` — `null` si le match est antérieur au figeage. */
function ratingsFor(m: EngineMatch, userId: string): { mine: number | null; opp: number | null } {
  return m.hostId === userId
    ? { mine: m.hostRatingBefore, opp: m.guestRatingBefore }
    : { mine: m.guestRatingBefore, opp: m.hostRatingBefore };
}

/** Jeux de la 1re manche `[hôte, invité]`, ou `null` si illisible. */
function firstSet(scoreHost: string): [number, number] | null {
  const m = /^\s*(\d{1,2})-(\d{1,2})/.exec(scoreHost);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** `true` si `userId` a perdu la 1re manche de ce match. */
function lostFirstSet(m: EngineMatch, userId: string): boolean {
  const fs = firstSet(m.scoreHost);
  if (!fs) return false;
  const [host, guest] = fs;
  const [mine, theirs] = m.hostId === userId ? [host, guest] : [guest, host];
  return mine < theirs;
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

// ── Calcul principal ─────────────────────────────────────────────────────────

/**
 * Calcule l'état des badges d'un joueur à partir de la liste de SES matchs
 * confirmés. `now` est injecté pour la testabilité (série « ce mois-ci »).
 * Ne gère PAS `passage_niveau` : ce haut fait est écrit au moment exact du
 * changement de niveau (cf. matches.service `applyEloUpdate`).
 */
export function computeBadges(
  userId: string,
  matches: EngineMatch[],
  now: Date = new Date(),
): BadgeComputation {
  const mine = matches
    .filter((m) => m.hostId === userId || m.guestId === userId)
    .slice()
    .sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime() || a.id.localeCompare(b.id));

  const series = computeSeries(userId, mine, now);
  const achievements = computeAchievements(userId, mine);
  return { series, achievements };
}

function computeSeries(userId: string, mine: EngineMatch[], now: Date): SerieResult[] {
  // S1 — victoires consécutives depuis la fin, avec adversaires distincts.
  let winRun = 0;
  const runOpponents = new Set<string>();
  for (let i = mine.length - 1; i >= 0; i--) {
    if (mine[i].winnerId !== userId) break;
    winRun++;
    runOpponents.add(opponentId(mine[i], userId));
  }
  const serieVictoires: SerieResult = {
    code: 'serie_victoires',
    value: winRun,
    target: SERIE_TARGETS.serie_victoires,
    earned: winRun >= SERIE_TARGETS.serie_victoires && runOpponents.size >= SERIE_VICTOIRES_MIN_DISTINCT,
  };

  // S2 — matchs joués dans le mois calendaire courant.
  const monthCount = mine.filter((m) => sameMonth(m.playedAt, now)).length;
  const matchsMois: SerieResult = {
    code: 'matchs_mois',
    value: monthCount,
    target: SERIE_TARGETS.matchs_mois,
    earned: monthCount >= SERIE_TARGETS.matchs_mois,
  };

  // S3 — matchs consécutifs depuis la fin sans aucun litige.
  let cleanRun = 0;
  for (let i = mine.length - 1; i >= 0; i--) {
    if (mine[i].wasDisputed) break;
    cleanRun++;
  }
  const sansAccroc: SerieResult = {
    code: 'sans_accroc',
    value: cleanRun,
    target: SERIE_TARGETS.sans_accroc,
    earned: cleanRun >= SERIE_TARGETS.sans_accroc,
  };

  return [serieVictoires, matchsMois, sansAccroc];
}

function computeAchievements(userId: string, mine: EngineMatch[]): EarnedAchievement[] {
  if (mine.length === 0) return [];

  const earned: EarnedAchievement[] = [];
  const add = (code: HautFaitCode, context?: Record<string, unknown>) => {
    earned.push(context ? { code, context } : { code });
  };

  // premier_match / veteran
  add('premier_match');
  if (mine.length >= VETERAN_TARGET) add('veteran');

  // vingt_adversaires
  const distinctOpponents = new Set(mine.map((m) => opponentId(m, userId)));
  if (distinctOpponents.size >= VINGT_ADVERSAIRES_TARGET) add('vingt_adversaires');

  // toujours_partant — matchs où le joueur était l'invité (celui qui a accepté).
  const accepted = mine.filter((m) => m.guestId === userId).length;
  if (accepted >= TOUJOURS_PARTANT_TARGET) add('toujours_partant');

  // fidele_club — max de matchs sur un même court non vide.
  const byCourt = new Map<string, number>();
  for (const m of mine) {
    const c = m.court.trim();
    if (!c) continue;
    byCourt.set(c, (byCourt.get(c) ?? 0) + 1);
  }
  const topClub = [...byCourt.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topClub && topClub[1] >= FIDELE_CLUB_TARGET) add('fidele_club', { club: topClub[0], matchs: topClub[1] });

  // Parcours des victoires pour les hauts faits "exploit".
  let firstStronger: EngineMatch | undefined;
  let firstOutsider: { match: EngineMatch; probability: number } | undefined;
  let firstTombeur: EngineMatch | undefined;
  let firstRemontada: EngineMatch | undefined;

  for (const m of mine) {
    if (m.winnerId !== userId) continue;

    const { mine: myR, opp: oppR } = ratingsFor(m, userId);
    if (myR !== null && oppR !== null) {
      const myLevel = ratingToLevel(myR);
      const oppLevel = ratingToLevel(oppR);
      if (!firstStronger && oppLevel > myLevel) firstStronger = m;
      if (!firstTombeur && oppLevel - myLevel >= 2) firstTombeur = m;
      if (!firstOutsider) {
        const p = winProbability(myR, oppR);
        if (p < OUTSIDER_MAX_PROBABILITY) firstOutsider = { match: m, probability: Math.round(p * 100) / 100 };
      }
    }

    if (!firstRemontada && lostFirstSet(m, userId)) firstRemontada = m;
  }

  if (firstStronger) add('premiere_victoire_plus_fort', { matchId: firstStronger.id });
  if (firstOutsider) add('outsider', { matchId: firstOutsider.match.id, probability: firstOutsider.probability });
  if (firstTombeur) add('le_tombeur', { matchId: firstTombeur.id });
  if (firstRemontada) add('remontada', { matchId: firstRemontada.id });

  return earned;
}
