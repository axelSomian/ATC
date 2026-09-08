import {
  computeBadges,
  type EngineMatch,
  SERIE_VICTOIRES_MIN_DISTINCT,
} from '../badges.engine';

const ME = 'me';
let seq = 0;

interface MkOpts {
  opp?: string;
  won?: boolean;
  day?: number;
  month?: number;
  year?: number;
  scoreHost?: string;
  court?: string;
  wasDisputed?: boolean;
  meRating?: number | null;
  oppRating?: number | null;
  meIsHost?: boolean;
}

function mk(opts: MkOpts = {}): EngineMatch {
  const opp = opts.opp ?? 'opp1';
  const meIsHost = opts.meIsHost ?? true;
  const won = opts.won ?? true;
  const y = opts.year ?? 2026;
  const mo = opts.month ?? 8; // septembre (0-indexé)
  const d = opts.day ?? 1;
  const meRating = opts.meRating === undefined ? 1000 : opts.meRating;
  const oppRating = opts.oppRating === undefined ? 1000 : opts.oppRating;
  const defaultScore = won ? '6-3 6-3' : '3-6 3-6';
  return {
    id: `m${String(seq++).padStart(4, '0')}`,
    playedAt: new Date(Date.UTC(y, mo, d, 12)),
    hostId: meIsHost ? ME : opp,
    guestId: meIsHost ? opp : ME,
    winnerId: won ? ME : opp,
    scoreHost: opts.scoreHost ?? (meIsHost ? defaultScore : won ? '3-6 3-6' : '6-3 6-3'),
    court: opts.court ?? 'Club A',
    wasDisputed: opts.wasDisputed ?? false,
    hostRatingBefore: meIsHost ? meRating : oppRating,
    guestRatingBefore: meIsHost ? oppRating : meRating,
  };
}

const NOW = new Date(Date.UTC(2026, 8, 20, 12));

function run(matches: EngineMatch[]) {
  const r = computeBadges(ME, matches, NOW);
  return {
    achievements: r.achievements.map((a) => a.code),
    ctx: (code: string) => r.achievements.find((a) => a.code === code)?.context,
    serie: (code: string) => r.series.find((s) => s.code === code)!,
  };
}

beforeEach(() => { seq = 0; });

// ── Cas vide ─────────────────────────────────────────────────────────────────

describe('computeBadges — aucun match', () => {
  it('ne débloque rien', () => {
    const r = run([]);
    expect(r.achievements).toEqual([]);
    expect(r.serie('serie_victoires').value).toBe(0);
    expect(r.serie('serie_victoires').earned).toBe(false);
  });
});

// ── premier_match / veteran ──────────────────────────────────────────────────

describe('premier_match', () => {
  it('se débloque au premier match', () => {
    expect(run([mk()]).achievements).toContain('premier_match');
  });
});

describe('veteran', () => {
  it('exige 25 matchs', () => {
    const before = run(Array.from({ length: 24 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1 })));
    expect(before.achievements).not.toContain('veteran');
    const at = run(Array.from({ length: 25 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1 })));
    expect(at.achievements).toContain('veteran');
  });
});

// ── S1 serie_victoires ───────────────────────────────────────────────────────

describe('serie_victoires', () => {
  it('compte les victoires consécutives depuis la fin', () => {
    const matches = [
      mk({ opp: 'a', won: false, day: 1 }),
      mk({ opp: 'b', won: true, day: 2 }),
      mk({ opp: 'c', won: true, day: 3 }),
      mk({ opp: 'd', won: true, day: 4 }),
    ];
    expect(run(matches).serie('serie_victoires').value).toBe(3);
  });

  it('se débloque à 5 victoires contre des adversaires distincts', () => {
    const matches = Array.from({ length: 5 }, (_, i) => mk({ opp: `o${i}`, day: i + 1, won: true }));
    const s = run(matches).serie('serie_victoires');
    expect(s.value).toBe(5);
    expect(s.earned).toBe(true);
  });

  it('ne se débloque pas si les 5 victoires sont contre la même personne (farming)', () => {
    const matches = Array.from({ length: 6 }, (_, i) => mk({ opp: 'sameguy', day: i + 1, won: true }));
    const s = run(matches).serie('serie_victoires');
    expect(s.value).toBe(6);
    expect(s.earned).toBe(false);
  });

  it(`exige au moins ${SERIE_VICTOIRES_MIN_DISTINCT} adversaires distincts`, () => {
    const matches = [
      mk({ opp: 'a', day: 1, won: true }),
      mk({ opp: 'a', day: 2, won: true }),
      mk({ opp: 'b', day: 3, won: true }),
      mk({ opp: 'b', day: 4, won: true }),
      mk({ opp: 'b', day: 5, won: true }),
    ];
    expect(run(matches).serie('serie_victoires').earned).toBe(false);
  });

  it('une défaite casse la série', () => {
    const matches = [
      ...Array.from({ length: 5 }, (_, i) => mk({ opp: `o${i}`, day: i + 1, won: true })),
      mk({ opp: 'x', day: 6, won: false }),
    ];
    const s = run(matches).serie('serie_victoires');
    expect(s.value).toBe(0);
    expect(s.earned).toBe(false);
  });
});

// ── S2 matchs_mois ───────────────────────────────────────────────────────────

describe('matchs_mois', () => {
  it('ne compte que le mois calendaire courant', () => {
    const matches = [
      mk({ opp: 'a', month: 7, day: 15 }), // août — hors mois
      mk({ opp: 'b', month: 8, day: 2 }),
      mk({ opp: 'c', month: 8, day: 9 }),
      mk({ opp: 'd', month: 8, day: 16 }),
    ];
    const s = run(matches).serie('matchs_mois');
    expect(s.value).toBe(3);
  });

  it('se débloque à 4 matchs dans le mois', () => {
    const matches = Array.from({ length: 4 }, (_, i) => mk({ opp: `o${i}`, month: 8, day: i + 1 }));
    expect(run(matches).serie('matchs_mois').earned).toBe(true);
  });
});

// ── S3 sans_accroc ───────────────────────────────────────────────────────────

describe('sans_accroc', () => {
  it('compte les matchs consécutifs sans litige depuis la fin', () => {
    const matches = [
      mk({ opp: 'a', day: 1, wasDisputed: true }),
      ...Array.from({ length: 4 }, (_, i) => mk({ opp: `o${i}`, day: i + 2 })),
    ];
    expect(run(matches).serie('sans_accroc').value).toBe(4);
  });

  it('se débloque à 10 matchs propres', () => {
    const matches = Array.from({ length: 10 }, (_, i) => mk({ opp: `o${i}`, day: i + 1 }));
    expect(run(matches).serie('sans_accroc').earned).toBe(true);
  });

  it('un litige au milieu casse la série', () => {
    const matches = [
      ...Array.from({ length: 8 }, (_, i) => mk({ opp: `o${i}`, day: i + 1 })),
      mk({ opp: 'x', day: 9, wasDisputed: true }),
      mk({ opp: 'y', day: 10 }),
      mk({ opp: 'z', day: 11 }),
    ];
    const s = run(matches).serie('sans_accroc');
    expect(s.value).toBe(2);
    expect(s.earned).toBe(false);
  });
});

// ── vingt_adversaires ────────────────────────────────────────────────────────

describe('vingt_adversaires', () => {
  it('exige 20 adversaires distincts', () => {
    const under = run(Array.from({ length: 19 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1 })));
    expect(under.achievements).not.toContain('vingt_adversaires');
    const at = run(Array.from({ length: 20 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1 })));
    expect(at.achievements).toContain('vingt_adversaires');
  });

  it('ne compte pas deux fois le même adversaire', () => {
    const matches = Array.from({ length: 25 }, (_, i) => mk({ opp: `o${i % 5}`, day: (i % 20) + 1 }));
    expect(run(matches).achievements).not.toContain('vingt_adversaires');
  });
});

// ── toujours_partant ─────────────────────────────────────────────────────────

describe('toujours_partant', () => {
  it('compte les matchs où le joueur était l\'invité (celui qui a accepté)', () => {
    const accepted = Array.from({ length: 10 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1, meIsHost: false }));
    expect(run(accepted).achievements).toContain('toujours_partant');
  });

  it('ne compte pas les matchs où le joueur était l\'organisateur', () => {
    const hosted = Array.from({ length: 10 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1, meIsHost: true }));
    expect(run(hosted).achievements).not.toContain('toujours_partant');
  });
});

// ── fidele_club ──────────────────────────────────────────────────────────────

describe('fidele_club', () => {
  it('exige 10 matchs sur le même court', () => {
    const matches = Array.from({ length: 10 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1, court: 'Tennis Club de Cocody' }));
    const r = run(matches);
    expect(r.achievements).toContain('fidele_club');
    expect(r.ctx('fidele_club')).toEqual({ club: 'Tennis Club de Cocody', matchs: 10 });
  });

  it('ne cumule pas des courts différents', () => {
    const matches = Array.from({ length: 12 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1, court: i % 2 ? 'A' : 'B' }));
    expect(run(matches).achievements).not.toContain('fidele_club');
  });

  it('ignore les courts vides', () => {
    const matches = Array.from({ length: 10 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1, court: '   ' }));
    expect(run(matches).achievements).not.toContain('fidele_club');
  });
});

// ── premiere_victoire_plus_fort / le_tombeur ─────────────────────────────────

describe('premiere_victoire_plus_fort & le_tombeur', () => {
  it('débloque « le déclic » pour une victoire contre un niveau au-dessus', () => {
    // moi 1000 (N2), adversaire 1250 (N3)
    const r = run([mk({ won: true, meRating: 1000, oppRating: 1250 })]);
    expect(r.achievements).toContain('premiere_victoire_plus_fort');
    expect(r.achievements).not.toContain('le_tombeur');
  });

  it('débloque « le tombeur » pour deux niveaux au-dessus', () => {
    // moi 1000 (N2), adversaire 1400 (N4)
    const r = run([mk({ won: true, meRating: 1000, oppRating: 1400 })]);
    expect(r.achievements).toContain('le_tombeur');
    expect(r.achievements).toContain('premiere_victoire_plus_fort');
  });

  it('ne se déclenche pas sur une défaite', () => {
    const r = run([mk({ won: false, meRating: 1000, oppRating: 1400 })]);
    expect(r.achievements).not.toContain('le_tombeur');
    expect(r.achievements).not.toContain('premiere_victoire_plus_fort');
  });

  it('ignore les matchs sans contexte figé (pas de rétroactif)', () => {
    const r = run([mk({ won: true, meRating: null, oppRating: null })]);
    expect(r.achievements).not.toContain('premiere_victoire_plus_fort');
    expect(r.achievements).not.toContain('le_tombeur');
    expect(r.achievements).not.toContain('outsider');
  });
});

// ── outsider ─────────────────────────────────────────────────────────────────

describe('outsider', () => {
  it('débloque pour une victoire donnée perdante (< 40 %)', () => {
    const r = run([mk({ won: true, meRating: 1000, oppRating: 1300 })]);
    expect(r.achievements).toContain('outsider');
    const ctx = r.ctx('outsider') as { probability: number };
    expect(ctx.probability).toBeLessThan(0.4);
  });

  it('ne débloque pas pour une victoire attendue', () => {
    const r = run([mk({ won: true, meRating: 1300, oppRating: 1000 })]);
    expect(r.achievements).not.toContain('outsider');
  });
});

// ── remontada ────────────────────────────────────────────────────────────────

describe('remontada', () => {
  it('débloque quand on gagne après avoir perdu la 1re manche', () => {
    // hôte = moi, je perds le 1er set 4-6 puis je gagne
    const r = run([mk({ meIsHost: true, won: true, scoreHost: '4-6 6-3 6-4' })]);
    expect(r.achievements).toContain('remontada');
  });

  it('gère la perspective de l\'invité', () => {
    // invité = moi ; scoreHost côté hôte « 6-4 3-6 4-6 » → je perds la 1re manche (4), je gagne
    const r = run([mk({ meIsHost: false, won: true, scoreHost: '6-4 3-6 4-6' })]);
    expect(r.achievements).toContain('remontada');
  });

  it('ne débloque pas si la 1re manche est gagnée', () => {
    const r = run([mk({ meIsHost: true, won: true, scoreHost: '6-4 6-3' })]);
    expect(r.achievements).not.toContain('remontada');
  });
});

// ── passage_niveau — hors moteur ─────────────────────────────────────────────

describe('passage_niveau', () => {
  it('n\'est jamais produit par le moteur (écrit au changement de niveau)', () => {
    const matches = Array.from({ length: 12 }, (_, i) => mk({ opp: `o${i}`, day: (i % 20) + 1, won: true, meRating: 1000, oppRating: 1000 }));
    expect(run(matches).achievements).not.toContain('passage_niveau');
  });
});
