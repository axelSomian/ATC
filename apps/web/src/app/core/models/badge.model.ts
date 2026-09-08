/** Série : compteur vivant (recalculé à la lecture, retombe à zéro). */
export interface BadgeSerie {
  code: string;
  label: string;
  description: string;
  value: number;
  target: number;
  earned: boolean;
}

/** Haut fait : permanent, débloqué une fois. */
export interface BadgeAchievement {
  code: string;
  label: string;
  description: string;
  earned: boolean;
  unlockedAt: string | null;
}

export interface BadgesPayload {
  series: BadgeSerie[];
  achievements: BadgeAchievement[];
  earnedCount: number;
  totalCount: number;
}
