import { buildDraw, standardOrder, seedCount, type DrawPlayer } from '../draw.rules';

/** Générateur pseudo-aléatoire déterministe pour des tests reproductibles. */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const players = (n: number): DrawPlayer[] =>
  Array.from({ length: n }, (_, i) => ({ userId: `p${i + 1}`, points: 1000 - i * 10, level: 3 }));

describe('ordre standard', () => {
  it('tableau de 8', () => expect(standardOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]));
  it('la n°1 et la n°2 sont dans des moitiés différentes', () => {
    const o = standardOrder(32);
    expect(o.indexOf(1)).toBeLessThan(16);
    expect(o.indexOf(2)).toBeGreaterThanOrEqual(16);
  });
  it('nombre de têtes de série', () => {
    expect([2, 4, 8, 16, 32].map(seedCount)).toEqual([0, 1, 2, 4, 8]);
  });
});

describe('tirage', () => {
  it('les byes vont aux mieux classés', () => {
    for (let k = 0; k < 20; k++) {
      const d = buildDraw(players(5), seeded(k + 1)); // tableau de 8, 3 byes
      const withBye: string[] = [];
      for (let m = 0; m < d.size / 2; m++) {
        const [a, b] = [d.positions[2 * m], d.positions[2 * m + 1]];
        expect(a || b).toBeTruthy(); // jamais deux byes
        if (!a || !b) withBye.push((a ?? b) as string);
      }
      expect(withBye.sort()).toEqual(['p1', 'p2', 'p3']);
    }
  });

  it('têtes de série placées et numérotées ; la 1 et la 2 ne se croisent qu’en finale', () => {
    const d = buildDraw(players(16), seeded(7));
    expect(d.seeds.get('p1')).toBe(1);
    expect(d.seeds.get('p4')).toBe(4);
    expect(d.seeds.size).toBe(4);
    expect(d.positions.indexOf('p1')).toBe(0);
    expect(d.positions.indexOf('p2')).toBeGreaterThanOrEqual(8);
  });

  it('départage par le niveau quand personne n’a de points', () => {
    const ps: DrawPlayer[] = [
      { userId: 'a', points: 0, level: 1 },
      { userId: 'b', points: 0, level: 5 },
      { userId: 'c', points: 0, level: 2 },
      { userId: 'd', points: 0, level: 4 },
    ];
    const d = buildDraw(ps, seeded(3));
    expect(d.seeds.get('b')).toBe(1);
    expect(d.positions[0]).toBe('b');
  });

  it('tous les joueurs sont placés une seule fois', () => {
    const d = buildDraw(players(23), seeded(11));
    const placed = d.positions.filter(Boolean);
    expect(placed).toHaveLength(23);
    expect(new Set(placed).size).toBe(23);
  });
});
