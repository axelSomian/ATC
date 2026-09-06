import {
  computeElo,
  initialRating,
  ratingToLevel,
  gamesFromScore,
  movMultiplier,
  movFromScore,
  MOV_MAX,
  winProbability,
  matchStakes,
} from '../elo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calcule les deux côtés d'un même match. */
function match(
  ratingA: number, gamesA: number,
  ratingB: number, gamesB: number,
  aWins: boolean,
) {
  return {
    a: computeElo(ratingA, gamesA, ratingB, aWins),
    b: computeElo(ratingB, gamesB, ratingA, !aWins),
  };
}

// ─── initialRating ────────────────────────────────────────────────────────────

describe('initialRating', () => {
  it.each([1, 2, 3, 4, 5])(
    'retourne 1000 quel que soit le niveau déclaré (%i)',
    (level) => { expect(initialRating(level)).toBe(1000); },
  );
});

// ─── ratingToLevel ────────────────────────────────────────────────────────────

describe('ratingToLevel', () => {
  describe('seuils exacts', () => {
    it.each([
      // [rating, expectedLevel]
      [899,  1],
      [900,  2],
      [1099, 2],
      [1100, 3],
      [1299, 3],
      [1300, 4],
      [1499, 4],
      [1500, 5],
    ] as [number, number][])('rating %i → niveau %i', (rating, level) => {
      expect(ratingToLevel(rating)).toBe(level);
    });
  });

  describe('milieu de plage', () => {
    it.each([
      [700,  1],
      [1000, 2],
      [1200, 3],
      [1400, 4],
      [1700, 5],
    ] as [number, number][])('rating %i → niveau %i', (rating, level) => {
      expect(ratingToLevel(rating)).toBe(level);
    });
  });

  it('rating extrême bas (< 600) → niveau 1', () => {
    expect(ratingToLevel(0)).toBe(1);
    expect(ratingToLevel(100)).toBe(1);
  });

  it('rating extrême haut (> 2000) → niveau 5', () => {
    expect(ratingToLevel(2000)).toBe(5);
    expect(ratingToLevel(9999)).toBe(5);
  });
});

// ─── computeElo ───────────────────────────────────────────────────────────────

describe('computeElo', () => {

  // ── Facteur K ──────────────────────────────────────────────────────────────

  describe('facteur K selon le nombre de matchs joués', () => {
    // Ratings égaux → E = 0.5 → delta = round(K × 0.5).
    // K=40 : round(20)=20 | K=25 : round(12.5)=13 | K=15 : round(7.5)=8

    describe('K = 40 pour myGames < 10', () => {
      it('premier match (myGames=0) → victoire +20', () => {
        expect(computeElo(1000, 0, 1000, true).delta).toBe(20);
      });
      it('9ème match (myGames=9) → victoire +20', () => {
        expect(computeElo(1000, 9, 1000, true).delta).toBe(20);
      });
    });

    describe('K = 25 pour 10 ≤ myGames < 30', () => {
      it('10ème match (myGames=10) → victoire +13', () => {
        expect(computeElo(1000, 10, 1000, true).delta).toBe(13);
      });
      it('29ème match (myGames=29) → victoire +13', () => {
        expect(computeElo(1000, 29, 1000, true).delta).toBe(13);
      });
    });

    describe('K = 15 pour myGames ≥ 30', () => {
      it('30ème match (myGames=30) → victoire +8', () => {
        expect(computeElo(1000, 30, 1000, true).delta).toBe(8);
      });
      it('joueur très expérimenté (myGames=100) → victoire +8', () => {
        expect(computeElo(1000, 100, 1000, true).delta).toBe(8);
      });
    });
  });

  // ── Ratings égaux ──────────────────────────────────────────────────────────

  describe('ratings égaux (1000 vs 1000)', () => {
    describe('K = 40', () => {
      it('victoire → delta +20, newRating 1020', () => {
        const r = computeElo(1000, 0, 1000, true);
        expect(r.delta).toBe(20);
        expect(r.newRating).toBe(1020);
      });
      it('défaite → delta -20, newRating 980', () => {
        const r = computeElo(1000, 0, 1000, false);
        expect(r.delta).toBe(-20);
        expect(r.newRating).toBe(980);
      });
    });

    describe('K = 25', () => {
      it('victoire → delta +13, newRating 1013', () => {
        const r = computeElo(1000, 10, 1000, true);
        expect(r.delta).toBe(13);
        expect(r.newRating).toBe(1013);
      });
      it('défaite → delta -12, newRating 988', () => {
        // Math.round(-12.5) = -12 en JS (arrondi vers +∞)
        const r = computeElo(1000, 10, 1000, false);
        expect(r.delta).toBe(-12);
        expect(r.newRating).toBe(988);
      });
    });

    describe('K = 15', () => {
      it('victoire → delta +8, newRating 1008', () => {
        const r = computeElo(1000, 30, 1000, true);
        expect(r.delta).toBe(8);
        expect(r.newRating).toBe(1008);
      });
      it('défaite → delta -7, newRating 993', () => {
        // Math.round(-7.5) = -7 en JS
        const r = computeElo(1000, 30, 1000, false);
        expect(r.delta).toBe(-7);
        expect(r.newRating).toBe(993);
      });
    });
  });

  // ── Favori (1200) vs outsider (1000) ───────────────────────────────────────
  // E_favori = 1/(1+10^(-0.5)) ≈ 0.7597   E_outsider ≈ 0.2403

  describe('favori 1200 pts vs outsider 1000 pts', () => {

    describe('K = 40 (myGames=5)', () => {
      // delta_favori_gagne  = round(40 × 0.2403) = round(9.61)  = 10
      // delta_favori_perd   = round(40 × -0.7597) = round(-30.39) = -30
      // delta_outsider_gagne = round(40 × 0.7597) = round(30.39) = 30
      // delta_outsider_perd  = round(40 × -0.2403) = round(-9.61)  = -10

      it('favori gagne → petit gain +10', () => {
        expect(computeElo(1200, 5, 1000, true).delta).toBe(10);
      });
      it('favori perd → grosse perte -30', () => {
        expect(computeElo(1200, 5, 1000, false).delta).toBe(-30);
      });
      it('outsider gagne → gros gain +30', () => {
        expect(computeElo(1000, 5, 1200, true).delta).toBe(30);
      });
      it('outsider perd → petite perte -10', () => {
        expect(computeElo(1000, 5, 1200, false).delta).toBe(-10);
      });
    });

    describe('K = 25 (myGames=15)', () => {
      // delta_favori_gagne  = round(25 × 0.2403) = round(6.007)  = 6
      // delta_favori_perd   = round(25 × -0.7597) = round(-18.99) = -19
      // delta_outsider_gagne = round(25 × 0.7597) = round(18.99)  = 19
      // delta_outsider_perd  = round(25 × -0.2403) = round(-6.007)  = -6

      it('favori gagne → petit gain +6', () => {
        expect(computeElo(1200, 15, 1000, true).delta).toBe(6);
      });
      it('favori perd → grosse perte -19', () => {
        expect(computeElo(1200, 15, 1000, false).delta).toBe(-19);
      });
      it('outsider gagne → gros gain +19', () => {
        expect(computeElo(1000, 15, 1200, true).delta).toBe(19);
      });
      it('outsider perd → petite perte -6', () => {
        expect(computeElo(1000, 15, 1200, false).delta).toBe(-6);
      });
    });

    describe('K = 15 (myGames=30)', () => {
      // delta_favori_gagne  = round(15 × 0.2403) = round(3.60)  = 4
      // delta_favori_perd   = round(15 × -0.7597) = round(-11.40) = -11
      // delta_outsider_gagne = round(15 × 0.7597) = round(11.40)  = 11
      // delta_outsider_perd  = round(15 × -0.2403) = round(-3.60)  = -4

      it('favori gagne → gain minimal +4', () => {
        expect(computeElo(1200, 30, 1000, true).delta).toBe(4);
      });
      it('favori perd → perte significative -11', () => {
        expect(computeElo(1200, 30, 1000, false).delta).toBe(-11);
      });
      it('outsider gagne → gain significatif +11', () => {
        expect(computeElo(1000, 30, 1200, true).delta).toBe(11);
      });
      it('outsider perd → perte minimale -4', () => {
        expect(computeElo(1000, 30, 1200, false).delta).toBe(-4);
      });
    });
  });

  // ── Écart extrême (1500 vs 600) ────────────────────────────────────────────
  // E_1500 ≈ 0.9944   E_600 ≈ 0.0056

  describe('écart extrême : 1500 pts vs 600 pts (K=40)', () => {
    // delta = round(K × (S - E))
    // 1500 gagne : round(40 × 0.0056) = round(0.224) = 0
    // 600  gagne : round(40 × 0.9944) = round(39.78) = 40
    // 1500 perd  : round(40 × -0.9944) = round(-39.78) = -40
    // 600  perd  : round(40 × -0.0056) = round(-0.224) = 0

    it('très grand favori gagne → delta nul (aucune récompense)', () => {
      expect(computeElo(1500, 0, 600, true).delta).toBe(0);
    });
    it('très grand favori perd → perte maximale égale à K', () => {
      expect(computeElo(1500, 0, 600, false).delta).toBe(-40);
    });
    it('outsider extrême gagne → gain maximal égal à K', () => {
      expect(computeElo(600, 0, 1500, true).delta).toBe(40);
    });
    it('outsider extrême perd → delta nul (aucune pénalité)', () => {
      // Math.round peut retourner -0 (zéro négatif JS) : on compare en valeur absolue
      expect(Math.abs(computeElo(600, 0, 1500, false).delta)).toBe(0);
    });
  });

  // ── Écrêtage du rating ──────────────────────────────────────────────────────

  describe('écrêtage : rating plafonné entre 600 et 2000', () => {
    it('newRating plafonné à 2000 si le delta dépasse le plafond', () => {
      // 1997 + round(15 × 0.5) = 1997 + 8 = 2005 → écrêté à 2000
      const r = computeElo(1997, 30, 1997, true);
      expect(r.delta).toBe(8);
      expect(r.newRating).toBe(2000);
    });

    it('newRating plancher à 600 si le delta dépasse le plancher', () => {
      // 602 + round(40 × -0.5) = 602 - 20 = 582 → écrêté à 600
      const r = computeElo(602, 0, 602, false);
      expect(r.delta).toBe(-20);
      expect(r.newRating).toBe(600);
    });

    it('le delta brut est retourné même quand le rating est écrêté', () => {
      // 1997 + 8 = 2005 → écrêté 2000, mais delta=8 (positif) est bien retourné
      const top = computeElo(1997, 30, 1997, true);
      expect(top.newRating).toBe(2000);
      expect(top.delta).toBeGreaterThan(0);
      // 602 - 20 = 582 → écrêté 600, mais delta=-20 (négatif) est bien retourné
      const bot = computeElo(602, 0, 602, false);
      expect(bot.newRating).toBe(600);
      expect(bot.delta).toBeLessThan(0);
    });

    it('newRating toujours dans [600, 2000] pour toutes les combinaisons', () => {
      const ratings = [600, 800, 1000, 1200, 1500, 1800, 2000];
      const games   = [0, 5, 15, 30];
      for (const my of ratings) {
        for (const opp of ratings) {
          for (const g of games) {
            expect(computeElo(my, g, opp, true ).newRating).toBeGreaterThanOrEqual(600);
            expect(computeElo(my, g, opp, true ).newRating).toBeLessThanOrEqual(2000);
            expect(computeElo(my, g, opp, false).newRating).toBeGreaterThanOrEqual(600);
            expect(computeElo(my, g, opp, false).newRating).toBeLessThanOrEqual(2000);
          }
        }
      }
    });
  });

  // ── Calcul du niveau ────────────────────────────────────────────────────────

  describe('calcul du niveau (newLevel)', () => {
    // Nouveau contrat : computeElo().newLevel = ratingToLevel(newRating), toujours.
    // Le « verrouillage 5 matchs » est la responsabilité de applyEloUpdate
    // (qui ne touche pas `level` avant MIN_GAMES_TO_MOVE_LEVEL) — testé côté service.

    describe('newLevel suit toujours newRating', () => {
      it('reflète le nouveau palier même dès le 1er match (myGames=0)', () => {
        const r = computeElo(1098, 0, 1000, true);
        expect(r.newRating).toBeGreaterThanOrEqual(1100);
        expect(r.newLevel).toBe(3);
      });

      it('indépendant du nombre de matchs joués', () => {
        for (const g of [0, 1, 3, 4, 10, 30]) {
          const r = computeElo(1098, g, 1000, true);
          expect(r.newLevel).toBe(ratingToLevel(r.newRating));
        }
      });
    });

    describe('niveau piloté par le rating', () => {
      it('niveau se met à jour quand un seuil est franchi', () => {
        const r = computeElo(1098, 4, 1000, true);
        expect(r.newRating).toBeGreaterThanOrEqual(1100);
        expect(r.newLevel).toBe(3);
      });

      it('niveau reste stable si le seuil n\'est pas franchi', () => {
        // 1050 + gain ≈ 1059 → toujours niveau 2 (< 1100)
        const r = computeElo(1050, 10, 950, true);
        expect(r.newLevel).toBe(2);
      });

      it('montée au niveau 5 (Professionnel) depuis 1495 pts', () => {
        // 1495 + round(15×0.5) = 1503 → niveau 5
        const r = computeElo(1495, 30, 1495, true);
        expect(r.newRating).toBeGreaterThanOrEqual(1500);
        expect(r.newLevel).toBe(5);
      });
    });

    describe('rétrogradation de niveau', () => {
      // computeElo(1101, 10, 1000, false) :
      //   K=25, E≈0.641, delta=round(25×-0.641)=-16
      //   newRating = 1085 (descend sous 1100 → niveau 2)

      it('rétrogradation quand newRating descend sous un seuil', () => {
        const r = computeElo(1101, 10, 1000, false);
        expect(r.newRating).toBeLessThan(1100);
        expect(r.newLevel).toBe(2);
      });

      it('niveau reste le même si newRating reste dans la même plage', () => {
        const r = computeElo(1200, 10, 1000, false);
        // 1200 - delta → restera au-dessus de 1100 → niveau 3 maintenu
        expect(r.newRating).toBeGreaterThanOrEqual(1100);
        expect(r.newLevel).toBe(3);
      });
    });

    it('les 5 niveaux sont tous atteignables via computeElo', () => {
      expect(computeElo(870, 10, 870, false).newLevel).toBe(1);  // < 900
      expect(computeElo(970, 10, 970, true).newLevel).toBe(2);   // 900–1099
      expect(computeElo(1150, 10, 1150, true).newLevel).toBe(3); // 1100–1299
      expect(computeElo(1350, 10, 1350, true).newLevel).toBe(4); // 1300–1499
      expect(computeElo(1495, 30, 1495, true).newLevel).toBe(5); // ≥ 1500
    });
  });

  // ── Invariants mathématiques ────────────────────────────────────────────────

  describe('invariants mathématiques', () => {
    it('la victoire ne produit jamais un delta négatif', () => {
      const ratings = [600, 800, 1000, 1200, 1500, 2000];
      const games   = [0, 5, 10, 30];
      for (const my of ratings) {
        for (const opp of ratings) {
          for (const g of games) {
            const { delta } = computeElo(my, g, opp, true);
            expect(delta).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    it('la défaite ne produit jamais un delta positif', () => {
      const ratings = [600, 800, 1000, 1200, 1500, 2000];
      const games   = [0, 5, 10, 30];
      for (const my of ratings) {
        for (const opp of ratings) {
          for (const g of games) {
            const { delta } = computeElo(my, g, opp, false);
            expect(delta).toBeLessThanOrEqual(0);
          }
        }
      }
    });

    it('quasi zero-sum : la somme des deltas des deux joueurs vaut 0 ou ±1', () => {
      // Le ±1 vient de Math.round sur les cas à 0.5 exact (K=25 ou K=15, ratings égaux)
      const cases: [number, number, number, number][] = [
        [1000, 0,  1000, 0],   // K=40 égaux
        [1000, 10, 1000, 10],  // K=25 égaux
        [1000, 30, 1000, 30],  // K=15 égaux
        [1200, 15, 1000, 15],  // K=25, ratings différents
        [1300, 30, 900,  30],  // K=15, grand écart
      ];
      for (const [rA, gA, rB, gB] of cases) {
        const win  = match(rA, gA, rB, gB, true);
        const loss = match(rA, gA, rB, gB, false);
        expect(Math.abs(win.a.delta  + win.b.delta)).toBeLessThanOrEqual(1);
        expect(Math.abs(loss.a.delta + loss.b.delta)).toBeLessThanOrEqual(1);
      }
    });

    it("l'outsider gagne plus de points que le favori en cas de victoire", () => {
      const deltaOutsider = computeElo(1000, 15, 1200, true).delta;
      const deltaFavori   = computeElo(1200, 15, 1000, true).delta;
      expect(deltaOutsider).toBeGreaterThan(deltaFavori);
    });

    it("perdre contre un outsider coûte plus que perdre contre un favori", () => {
      // Favori (1200) perd contre outsider (1000) vs perd contre plus fort (1400)
      const perdreFaible = computeElo(1200, 15, 1000, false).delta;  // -19
      const perdreFort   = computeElo(1200, 15, 1400, false).delta;  // -6
      expect(perdreFaible).toBeLessThan(perdreFort);
    });

    it('un joueur avec plus de matchs gagne/perd moins de points (K décroissant)', () => {
      // ratings égaux → delta proportionnel à K
      const deltaK40 = computeElo(1000, 0,  1000, true).delta;  // K=40 → 20
      const deltaK25 = computeElo(1000, 10, 1000, true).delta;  // K=25 → 13
      const deltaK15 = computeElo(1000, 30, 1000, true).delta;  // K=15 → 8
      expect(deltaK40).toBeGreaterThan(deltaK25);
      expect(deltaK25).toBeGreaterThan(deltaK15);
    });

    it('la symétrie est respectée : A bat B donne exactement les mêmes deltas que B perd contre A', () => {
      const { a, b } = match(1200, 15, 1000, 15, true);
      expect(a.delta).toBe(computeElo(1200, 15, 1000, true ).delta);
      expect(b.delta).toBe(computeElo(1000, 15, 1200, false).delta);
    });
  });

  // ── Régression : le delta -19 correspond à une défaite ─────────────────────

  describe('régression — le delta -19 implique toujours une défaite', () => {
    it('favori (1200, K=25) qui PERD contre outsider (1000) → -19', () => {
      expect(computeElo(1200, 15, 1000, false).delta).toBe(-19);
    });

    it('favori (1200, K=25) qui GAGNE contre outsider (1000) → +6 (jamais négatif)', () => {
      const r = computeElo(1200, 15, 1000, true);
      expect(r.delta).toBe(6);
      expect(r.delta).toBeGreaterThan(0);
    });

    it('un delta de -19 ne peut pas provenir d\'une victoire (toutes combinaisons)', () => {
      // Aucune combinaison (rating × games) ne produit delta < 0 sur une victoire
      const ratings = [600, 800, 900, 1000, 1100, 1200, 1300, 1500, 1800, 2000];
      const games   = [0, 4, 5, 9, 10, 15, 29, 30, 50];
      for (const my of ratings) {
        for (const opp of ratings) {
          for (const g of games) {
            expect(computeElo(my, g, opp, true).delta).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    it('les deltas ±19 sont toujours zero-sum (pas de création de points)', () => {
      // Les deux joueurs impliqués dans le match 1200 vs 1000 (K=25)
      const win  = match(1200, 15, 1000, 15, true);   // favori gagne
      const loss = match(1200, 15, 1000, 15, false);  // favori perd
      expect(win.a.delta  + win.b.delta).toBe(0);   // +6 + (-6) = 0
      expect(loss.a.delta + loss.b.delta).toBe(0);  // -19 + 19 = 0
    });
  });

});

// ─── gamesFromScore ───────────────────────────────────────────────────────────

describe('gamesFromScore', () => {
  it.each([
    ['6-4 7-5',        [13, 9]],
    ['6-0 6-0',        [12, 0]],
    ['6-4 3-6 7-5',    [16, 15]],
    ['6-4, 3-6, 7-5',  [16, 15]],  // séparateur virgule
    ['  7-6   6-7 ',   [13, 13]],  // espaces multiples / bords
  ] as [string, [number, number]][])('« %s » → %j', (score, expected) => {
    expect(gamesFromScore(score)).toEqual(expected);
  });

  it('ignore les fragments non « n-n » (annotation de tie-break)', () => {
    expect(gamesFromScore('6-4 7-6(4)')).toEqual([13, 10]);
  });

  it('retourne null si rien d\'exploitable', () => {
    expect(gamesFromScore('')).toBeNull();
    expect(gamesFromScore('abandon')).toBeNull();
    expect(gamesFromScore('—')).toBeNull();
  });
});

// ─── movMultiplier ────────────────────────────────────────────────────────────

describe('movMultiplier', () => {
  it('correction sèche (6-0 6-0) → plafond MOV_MAX', () => {
    expect(movMultiplier(12, 0)).toBeCloseTo(MOV_MAX, 5);
  });

  it('match serré (7-6 7-6) → quasi 1', () => {
    expect(movMultiplier(14, 12)).toBeCloseTo(1.0308, 3);
  });

  it('victoire nette en deux sets (6-4 6-4) → entre les deux', () => {
    const m = movMultiplier(12, 8);
    expect(m).toBeGreaterThan(1);
    expect(m).toBeLessThan(MOV_MAX);
  });

  it('jamais < 1 ni > MOV_MAX', () => {
    for (let w = 0; w <= 20; w++) {
      for (let l = 0; l <= 20; l++) {
        const m = movMultiplier(w, l);
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(MOV_MAX);
      }
    }
  });

  it('score « à l\'envers » (perdant avec plus de jeux) retombe à 1', () => {
    expect(movMultiplier(5, 7)).toBe(1);
  });

  it('total de jeux nul → 1 (pas de division par zéro)', () => {
    expect(movMultiplier(0, 0)).toBe(1);
  });
});

// ─── movFromScore ─────────────────────────────────────────────────────────────

describe('movFromScore', () => {
  it('oriente la marge selon le vainqueur', () => {
    // "6-0 6-0" côté hôte : si l'hôte gagne → gros facteur ; s'il perd → 1
    expect(movFromScore('6-0 6-0', true)).toBeCloseTo(MOV_MAX, 5);
    expect(movFromScore('6-0 6-0', false)).toBe(1);
  });

  it('score illisible → 1', () => {
    expect(movFromScore('abandon', true)).toBe(1);
  });
});

// ─── computeElo — paramètre mov ───────────────────────────────────────────────

describe('computeElo — facteur de marge', () => {
  it('mov = 1 par défaut → comportement inchangé', () => {
    expect(computeElo(1000, 0, 1000, true)).toEqual(computeElo(1000, 0, 1000, true, 1));
    expect(computeElo(1000, 0, 1000, true).delta).toBe(20);
  });

  it('une correction amplifie le gain (1000 vs 1000, K=40)', () => {
    // round(40 × 0.5 × 1.4) = round(28) = 28
    expect(computeElo(1000, 0, 1000, true, 1.4).delta).toBe(28);
    expect(computeElo(1000, 0, 1000, true, 1.4).newRating).toBe(1028);
  });

  it('la marge amplifie aussi la perte du perdant (symétrie)', () => {
    expect(computeElo(1000, 0, 1000, false, 1.4).delta).toBe(-28);
  });

  it('reste quasi zéro-somme : même mov appliqué aux deux joueurs', () => {
    const mov = movFromScore('6-1 6-2', true); // hôte gagne
    const a = computeElo(1000, 0, 1000, true, mov);
    const b = computeElo(1000, 0, 1000, false, mov);
    expect(Math.abs(a.delta + b.delta)).toBeLessThanOrEqual(1);
  });

  it('la marge ne peut pas inverser le signe du delta', () => {
    for (const mov of [1, 1.1, 1.25, MOV_MAX]) {
      expect(computeElo(900, 5, 1400, true, mov).delta).toBeGreaterThanOrEqual(0);
      expect(computeElo(1400, 5, 900, false, mov).delta).toBeLessThanOrEqual(0);
    }
  });

  it('newRating reste borné [600, 2000] même avec mov maximal', () => {
    expect(computeElo(1990, 0, 600, false, MOV_MAX).newRating).toBeGreaterThanOrEqual(600);
    expect(computeElo(600, 0, 1990, true, MOV_MAX).newRating).toBeLessThanOrEqual(2000);
  });
});

// ─── winProbability ───────────────────────────────────────────────────────────

describe('winProbability', () => {
  it('ratings égaux → 0,5', () => {
    expect(winProbability(1200, 1200)).toBeCloseTo(0.5, 10);
  });

  it('somme des deux côtés = 1', () => {
    for (const [a, b] of [[1000, 1300], [1450, 900], [1600, 1605]] as [number, number][]) {
      expect(winProbability(a, b) + winProbability(b, a)).toBeCloseTo(1, 10);
    }
  });

  it('200 pts d\'avance ≈ 76 %, 400 pts ≈ 91 %', () => {
    expect(winProbability(1200, 1000)).toBeCloseTo(0.76, 2);
    expect(winProbability(1400, 1000)).toBeCloseTo(0.909, 2);
  });
});

// ─── matchStakes ──────────────────────────────────────────────────────────────

describe('matchStakes', () => {
  it('matchup égal → bande « balanced », gains ≈ symétriques', () => {
    const s = matchStakes(1000, 10, 1000);   // K = 25
    expect(s.band).toBe('balanced');
    expect(s.probability).toBe(0.5);
    expect(s.deltaWin).toBe(13);
    expect(s.deltaLoss).toBe(-12);           // Math.round(-12.5) = -12
  });

  it('adversaire nettement plus fort → « outsider » : gros gain, petite perte', () => {
    const s = matchStakes(1000, 10, 1300);
    expect(s.band).toBe('outsider');
    expect(s.probability).toBeLessThan(0.4);
    expect(s.deltaWin).toBeGreaterThan(Math.abs(s.deltaLoss));
    expect(s.deltaWin).toBeGreaterThan(0);
    expect(s.deltaLoss).toBeLessThan(0);
  });

  it('adversaire nettement plus faible → « favorite » : petit gain, grosse perte', () => {
    const s = matchStakes(1300, 10, 1000);
    expect(s.band).toBe('favorite');
    expect(s.probability).toBeGreaterThan(0.6);
    expect(Math.abs(s.deltaLoss)).toBeGreaterThan(s.deltaWin);
  });

  it('les points en jeu correspondent à computeElo (mov neutre)', () => {
    const s = matchStakes(1120, 22, 1240);
    expect(s.deltaWin).toBe(computeElo(1120, 22, 1240, true).delta);
    expect(s.deltaLoss).toBe(computeElo(1120, 22, 1240, false).delta);
  });

  it('bornes de bande : ~40 % et ~60 %', () => {
    expect(matchStakes(1000, 10, 1100).band).toBe('outsider');   // p ≈ 0,36
    expect(matchStakes(1000, 10, 1050).band).toBe('balanced');   // p ≈ 0,43
    expect(matchStakes(1100, 10, 1000).band).toBe('favorite');   // p ≈ 0,64
  });
});
