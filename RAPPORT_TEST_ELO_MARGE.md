# Rapport de test — Marge du score dans l'ELO

**Date :** 2026-09-06
**Périmètre :** ajout du facteur de marge (`mov`) au moteur de niveau
**Fichiers testés :** `apps/api/src/modules/matches/elo.ts`

---

## Résumé

| Contrôle | Résultat |
|----------|----------|
| Suite de tests `elo` | ✅ **92 / 92** |
| Couverture `elo.ts` | ✅ **100 %** (stmts / branches / funcs / lines) |
| `tsc --noEmit` (API entière) | ✅ **0 erreur** |
| Non-régression (71 tests existants) | ✅ inchangés |
| Nouveaux tests | **21** |

Commandes :
```bash
cd apps/api
npx jest elo --verbose
npx jest elo --coverage --collectCoverageFrom='src/modules/matches/elo.ts'
npx tsc --noEmit
```

---

## Non-régression — 71 tests existants

Tous verts sans modification. Le 5ᵉ paramètre `mov` de `computeElo` a une valeur
par défaut de `1`, donc **tous les appels à 4 arguments produisent exactement le
même résultat qu'avant** :

- `initialRating` (5) — départ à 1000 quel que soit le niveau déclaré
- `ratingToLevel` (15) — seuils 900 / 1100 / 1300 / 1500, bornes extrêmes
- `computeElo` facteur K (6) — 40 / 25 / 15 selon `myGames`
- `computeElo` ratings égaux (6), favori vs outsider (12), écart extrême (4)
- écrêtage rating [600, 2000] (4)
- calcul / rétrogradation de niveau (8)
- invariants mathématiques (7) — victoire ≥ 0, défaite ≤ 0, quasi zéro-somme, symétrie
- régression « delta −19 » (4)

Test de garde explicite ajouté :
> `computeElo(1000, 0, 1000, true)` **===** `computeElo(1000, 0, 1000, true, 1)` → `delta = 20`

---

## Nouveaux tests — 21

### `gamesFromScore` — parsing du score (7)

| Entrée | Sortie attendue | Vérifie |
|--------|-----------------|---------|
| `"6-4 7-5"` | `[13, 9]` | cas nominal 2 sets |
| `"6-0 6-0"` | `[12, 0]` | blanchi |
| `"6-4 3-6 7-5"` | `[16, 15]` | 3 sets |
| `"6-4, 3-6, 7-5"` | `[16, 15]` | séparateur virgule |
| `"  7-6   6-7 "` | `[13, 13]` | espaces multiples / bords |
| `"6-4 7-6(4)"` | `[13, 10]` | annotation de tie-break tolérée |
| `""`, `"abandon"`, `"—"` | `null` | rien d'exploitable → fallback |

### `movMultiplier` — facteur de marge (6)

| Cas | Attendu |
|-----|---------|
| Correction sèche `12–0` | plafond `MOV_MAX` (1,4) |
| Match serré `14–12` | ≈ 1,031 |
| Victoire nette `12–8` | strictement entre 1 et 1,4 |
| **441 combinaisons** `w,l ∈ [0,20]` | toujours `∈ [1 ; 1,4]` |
| Score « à l'envers » `5–7` (perdant devant) | retombe à `1` |
| Total nul `0–0` | `1` (pas de division par zéro) |

### `movFromScore` — orientation selon le vainqueur (2)

- `"6-0 6-0"` + hôte gagne → ×1,4 · + hôte perd → ×1,0
- score illisible → `1`

### `computeElo` avec `mov` (6)

| Test | Attendu |
|------|---------|
| `mov = 1` par défaut | résultat identique à l'ancien contrat |
| Correction (1000 vs 1000, K 40, mov 1,4) | `delta = round(40 × 0,5 × 1,4) = 28` → 1028 |
| Perte du perdant amplifiée pareil | `delta = −28` (symétrie) |
| Même `mov` appliqué aux 2 joueurs | somme des deltas `∈ [−1 ; +1]` (quasi zéro-somme préservé) |
| La marge n'inverse **jamais** le signe | victoire ≥ 0, défaite ≤ 0, pour `mov ∈ {1 ; 1,1 ; 1,25 ; 1,4}` |
| Bornes rating | reste `∈ [600 ; 2000]` même avec `mov` maximal |

---

## Couverture

```
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered
----------|---------|----------|---------|---------|----------
 elo.ts   |     100 |      100 |     100 |     100 |    —
```

Toutes les branches de `gamesFromScore` (fragment ignoré, aucun set valide) et de
`movMultiplier` (`total <= 0`, `max(0, …)`, les deux bornes du `clamp`) sont
exercées.

---

## Hors couverture automatique

Le repo `apps/api` n'a **pas de test de service** (seul `elo.test.ts` existe). Le
câblage suivant est vérifié par `tsc` + revue de code, pas par un test :

- `applyEloUpdate(hostId, guestId, winnerId, scoreHost?)` — calcul du `mov` une
  seule fois puis passage aux deux `computeElo`
- appel depuis `validateMatch` avec `match.scoreHost`
- appel depuis `resolveMatch` (admin) avec `updated.scoreHost` (score corrigé)

**Test manuel recommandé avant mise en prod :**
1. Enregistrer + confirmer un match `6-0 6-0` entre deux joueurs à rating égal →
   vérifier `ratingDelta` ≈ ±28 (au lieu de ±20).
2. Idem avec `7-6 7-6` → `ratingDelta` ≈ ±21.
3. Contester un score puis le résoudre côté admin → l'ELO s'applique avec la marge
   du score retenu par l'admin.

---

## Verdict

✅ **Prêt à intégrer.** Aucune régression, couverture complète des fonctions
pures, propriété de quasi zéro-somme conservée. Reste un test manuel du parcours
match complet (pas d'infra de test service dans le repo).
