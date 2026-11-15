// Miroir front des règles du classement (source de vérité :
// apps/api/src/modules/tournaments/ranking.rules.ts). Sert uniquement à
// l'aperçu des points dans le formulaire admin — le calcul réel est fait par l'API.

export type TournamentCategory = 'club' | 'challenger' | 'open' | 'grand_chelem';

export const TOURNAMENT_CATEGORY_OPTIONS: { value: TournamentCategory; label: string; minPlayers: number; coef: number }[] = [
  { value: 'club', label: 'Club', minPlayers: 4, coef: 1 },
  { value: 'challenger', label: 'Challenger', minPlayers: 8, coef: 1.5 },
  { value: 'open', label: 'Open', minPlayers: 16, coef: 2 },
  { value: 'grand_chelem', label: 'Grand Chelem', minPlayers: 32, coef: 3 },
];

export const LEVEL_BASE_POINTS: Record<number, number> = { 1: 60, 2: 120, 3: 250, 4: 500, 5: 1000 };

export function categoryLabel(c: TournamentCategory | null | undefined): string {
  return TOURNAMENT_CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? 'Club';
}

/** Points du vainqueur / finaliste / demi-finaliste pour un niveau (null = open → N5) et une catégorie. */
export function pointsPreview(maxLevel: number | null | undefined, category: TournamentCategory | null | undefined) {
  const base = LEVEL_BASE_POINTS[maxLevel ?? 5];
  const coef = TOURNAMENT_CATEGORY_OPTIONS.find((o) => o.value === category)?.coef ?? 1;
  const p = (share: number) => Math.max(1, Math.round(base * coef * share));
  return { winner: p(1), finalist: p(0.6), semi: p(0.36) };
}

export interface PointsBreakdown {
  total: number;
  results: {
    tournamentId: string;
    tournamentName: string;
    points: number;
    position: number | null;
    level: number | null;
    category: TournamentCategory | null;
    categoryLabel: string | null;
    source: 'auto' | 'manual';
    earnedAt: string;
    expiresAt: string;
    expired: boolean;
    counted: boolean;
  }[];
}
