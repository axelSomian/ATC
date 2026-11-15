import {
  resultPoints,
  roundShare,
  resultsFromBracket,
  rankingTotal,
  countedResults,
  levelUpTarget,
  tournamentLevel,
  categoryOf,
  type BracketMatchLike,
} from '../ranking.rules';

const NOW = new Date('2026-11-14T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe('barème', () => {
  it('vainqueur / finaliste / demi / quart / 8e', () => {
    expect(roundShare(5, 5, true)).toBe(1);
    expect(roundShare(5, 5, false)).toBe(0.6);
    expect(roundShare(4, 5, false)).toBe(0.36);
    expect(roundShare(3, 5, false)).toBe(0.18);
    expect(roundShare(2, 5, false)).toBe(0.09);
  });

  it('niveau × catégorie', () => {
    const p = (level: number, category: 'club' | 'challenger' | 'open' | 'grand_chelem') =>
      resultPoints({ level, category, roundReached: 3, totalRounds: 3, isChampion: true });
    expect(p(5, 'club')).toBe(1000);
    expect(p(1, 'club')).toBe(60);
    expect(p(1, 'challenger')).toBe(90);
    expect(p(1, 'grand_chelem')).toBe(180);
    expect(p(4, 'open')).toBe(1000);
  });

  it('minimum 1 point', () => {
    expect(resultPoints({ level: 1, category: 'club', roundReached: 1, totalRounds: 6, isChampion: false })).toBe(1);
  });

  it('cas PO : 6 Grands Chelems N1 ≈ 1 victoire Club N5', () => {
    const gcN1 = resultPoints({ level: 1, category: 'grand_chelem', roundReached: 5, totalRounds: 5, isChampion: true });
    expect(6 * gcN1).toBeLessThan(1100);
  });

  it('tournoi open = N5, catégorie inconnue = club', () => {
    expect(tournamentLevel(null)).toBe(5);
    expect(tournamentLevel(2)).toBe(2);
    expect(categoryOf('xxx')).toBe('club');
    expect(categoryOf('open')).toBe('open');
  });
});

describe('résultats depuis le tableau', () => {
  // Tableau de 4 avec un bye : a (bye) — b/c — puis finale a/b, b gagne.
  const bracket: BracketMatchLike[] = [
    { round: 1, playerAId: 'a', playerBId: null, winnerId: 'a' },
    { round: 1, playerAId: 'b', playerBId: 'c', winnerId: 'b' },
    { round: 2, playerAId: 'a', playerBId: 'b', winnerId: 'b' },
  ];

  it('tour atteint et position', () => {
    const r = resultsFromBracket(bracket)!;
    const by = Object.fromEntries(r.map((x) => [x.userId, x]));
    expect(by.b).toMatchObject({ isChampion: true, position: 1, roundReached: 2 });
    expect(by.a).toMatchObject({ isChampion: false, position: 2, roundReached: 2 });
    expect(by.c).toMatchObject({ isChampion: false, position: 3, roundReached: 1 });
  });

  it('null tant que la finale n’est pas jouée', () => {
    expect(resultsFromBracket([...bracket.slice(0, 2), { round: 2, playerAId: 'a', playerBId: 'b', winnerId: null }])).toBeNull();
    expect(resultsFromBracket([])).toBeNull();
  });
});

describe('classement', () => {
  it('6 meilleurs résultats seulement', () => {
    const results = [100, 90, 80, 70, 60, 50, 40, 30].map((points) => ({ points, earnedAt: daysAgo(10) }));
    expect(rankingTotal(results, NOW)).toBe(450);
    expect(countedResults(results, NOW)).toHaveLength(6);
  });

  it('les points de plus de 12 mois expirent', () => {
    const results = [
      { points: 1000, earnedAt: daysAgo(400) },
      { points: 60, earnedAt: daysAgo(30) },
    ];
    expect(rankingTotal(results, NOW)).toBe(60);
  });
});

describe('montée de niveau', () => {
  const none = new Set<string>();

  it('1 victoire à son niveau : pas de montée', () => {
    expect(levelUpTarget(1, [{ tournamentId: 't1', level: 1, earnedAt: daysAgo(5) }], none, NOW)).toBeNull();
  });

  it('2 victoires à son niveau : +1', () => {
    const wins = [
      { tournamentId: 't1', level: 1, earnedAt: daysAgo(50) },
      { tournamentId: 't2', level: 1, earnedAt: daysAgo(5) },
    ];
    expect(levelUpTarget(1, wins, none, NOW)).toEqual({ toLevel: 2, tournamentIds: ['t1', 't2'] });
  });

  it('victoire à un niveau supérieur : directement ce niveau', () => {
    expect(levelUpTarget(1, [{ tournamentId: 't3', level: 3, earnedAt: daysAgo(1) }], none, NOW)).toEqual({ toLevel: 3, tournamentIds: ['t3'] });
  });

  it('les victoires en dessous de son niveau ne comptent pas', () => {
    const wins = [
      { tournamentId: 't1', level: 1, earnedAt: daysAgo(50) },
      { tournamentId: 't2', level: 1, earnedAt: daysAgo(5) },
    ];
    expect(levelUpTarget(2, wins, none, NOW)).toBeNull();
  });

  it('une victoire déjà utilisée pour monter ne recompte pas', () => {
    const wins = [
      { tournamentId: 't3', level: 2, earnedAt: daysAgo(50) },
      { tournamentId: 't4', level: 2, earnedAt: daysAgo(5) },
    ];
    expect(levelUpTarget(2, wins, new Set(['t3']), NOW)).toBeNull();
  });

  it('victoires de plus de 12 mois ignorées ; N5 ne monte plus', () => {
    const old = [
      { tournamentId: 't1', level: 1, earnedAt: daysAgo(400) },
      { tournamentId: 't2', level: 1, earnedAt: daysAgo(5) },
    ];
    expect(levelUpTarget(1, old, none, NOW)).toBeNull();
    expect(levelUpTarget(5, [{ tournamentId: 'x', level: 5, earnedAt: daysAgo(1) }, { tournamentId: 'y', level: 5, earnedAt: daysAgo(1) }], none, NOW)).toBeNull();
  });
});
