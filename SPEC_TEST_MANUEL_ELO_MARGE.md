# Spécifications de test manuel — Marge du score dans l'ELO

**Fonctionnalité :** l'ajustement ELO d'un match confirmé est multiplié par un
**facteur de marge** (`mov`) déduit de l'écart de jeux du score.
**Date :** 2026-09-06 · **Code :** `apps/api/src/modules/matches/elo.ts` + `matches.service.ts` + `admin.service.ts`

---

## 1. Rappel du calcul

```
E        = 1 / (1 + 10^((ratingAdv − ratingMoi) / 400))       # probabilité de victoire
K        = 40 si < 10 matchs · 25 si 10–29 · 15 si ≥ 30       # sur ratingGames AVANT le match
dominance = max(0, jeux_vainqueur − jeux_perdant) / (jeux_vainqueur + jeux_perdant)
mov      = borne(1 + dominance × 0,4 ; entre 1 et 1,4)         # MOV_SLOPE = 0,4 · MOV_MAX = 1,4
delta    = arrondi( K × (S − E) × mov )                        # S = 1 victoire, 0 défaite
newRating = borne(rating + delta ; entre 600 et 2000)
```

- `mov` **identique pour les deux joueurs** (calculé une seule fois par match).
- Score absent / illisible → `mov = 1` (comportement d'avant).
- Score « à l'envers » (perdant avec + de jeux, ex. abandon) → `mov = 1`.
- Arrondi = `Math.round` JS : `−20,5 → −20`, `20,5 → 21` (demi vers +∞).
- `level` (les 5 dots) ne bouge qu'à partir du **5ᵉ** match confirmé
  (`ratingGames + 1 ≥ 5`). Avant, seul `rating` / `ratingDelta` changent.

### Table de référence `mov` (à réutiliser dans les cas)

| Score (2 sets) | Jeux | dominance | `mov` |
|----------------|------|-----------|-------|
| 6-0 6-0 | 12–0 | 1,000 | **1,40** |
| 6-1 6-0 | 12–1 | 0,846 | 1,34 |
| 6-1 6-1 | 12–2 | 0,714 | 1,29 |
| 6-2 6-2 | 12–4 | 0,500 | 1,20 |
| 6-3 6-3 | 12–6 | 0,333 | 1,13 |
| 6-4 6-3 | 12–7 | 0,263 | 1,11 |
| 6-4 6-4 | 12–8 | 0,200 | 1,08 |
| 7-5 7-5 | 14–10 | 0,167 | 1,07 |
| 7-6 7-6 | 14–12 | 0,077 | 1,03 |
| 7-6 6-7 7-6 | 20–19 | 0,026 | 1,01 |

---

## 2. Pré-requis

- 2 comptes de test : **Joueur A** et **Joueur B**.
- 1 compte **admin** (pour les cas litige) — `guyaxelsomian@gmail.com`.
- Pouvoir remettre `rating` / `ratingGames` / `ratingDelta` / `level` à des valeurs
  connues avant chaque cas (Prisma Studio, ou SQL sur Neon) :
  ```sql
  UPDATE "User" SET rating = 1000, "ratingGames" = 0, "ratingDelta" = 0, level = 2
  WHERE email IN ('a@test.dev', 'b@test.dev');
  ```
- Un match « à scorer » disponible entre A et B (via une annonce acceptée ou un
  défi rapide accepté).

### Où lire le résultat

| Donnée | Endroit |
|--------|---------|
| `rating`, `ratingGames`, `ratingDelta`, `level` | table `User` (Prisma Studio / SQL) |
| `rating`, `ratingDelta`, `rank` | `GET /api/v1/matches/me/stats` (connecté en tant que A ou B) |
| `scoreHost` / `scoreGuest` / `winnerId` / `status` | table `Match` |
| Historique côté app | page **Mes matchs** |

> L'ELO s'applique en tâche de fond (`bg(...)`) juste après la confirmation —
> laisser ~1 s puis rafraîchir.

---

## 3. Cas de test

Sauf mention contraire : **A et B partent à `rating = 1000`, `ratingGames = 0`**
(donc `E = 0,5`, `K = 40` des deux côtés), **A gagne**.

---

### TC1 — Effet marge, matchup égal (le cœur de la feature)

Même matchup, on ne change **que le score**.

| # | Score saisi (A gagne) | `mov` | Δ A attendu | Δ B attendu | rating A / B |
|---|-----------------------|-------|-------------|-------------|--------------|
| TC1a | **6-0 6-0** | 1,40 | **+28** | **−28** | 1028 / 972 |
| TC1b | **6-3 6-4** | 1,105 | **+22** | **−22** | 1022 / 978 |
| TC1c | **7-6 7-6** | 1,031 | **+21** | **−21** | 1021 / 979 |

**Vérifs :**
- `ratingDelta` de A = valeur ci-dessus, `ratingDelta` de B = son opposé.
- `Δ A + Δ B = 0` (somme nulle, K identique).
- `ratingGames` = 1 pour les deux · `level` **inchangé** (< 5 matchs).
- Le seul facteur qui fait varier +28 / +22 / +21 est le score.

---

### TC2 — Fallback score illisible → `mov = 1`

Impossible via l'UI (saisie structurée), donc à faire **via le litige admin** :
A vs B (1000 / 0), match enregistré puis contesté par B. L'admin résout avec
`winnerRole = host` et `scoreHost = "abandon"` (texte libre, non `n-n`).

| Attendu | Valeur |
|---------|--------|
| `mov` appliqué | 1,00 |
| Δ A | **+20** → 1020 |
| Δ B | **−20** → 980 |

**Vérif :** identique au calcul ELO d'avant la feature (aucun plantage, pas de `NaN`).

---

### TC3 — Favori qui corrige l'outsider (marge + écart de niveau + K différents)

Setup : **A = 1200, `ratingGames` = 15** (K 25) · **B = 1000, `ratingGames` = 8** (K 40).
A gagne **6-1 6-2** (`mov` = 1,24).

| Joueur | Calcul | Δ attendu | newRating |
|--------|--------|-----------|-----------|
| A (favori) | `round(25 × (1 − 0,7597) × 1,24)` | **+7** | 1207 |
| B (outsider) | `round(40 × (0 − 0,2403) × 1,24)` | **−12** | 988 |

**Vérifs :**
- `Δ A + Δ B ≠ 0` ici (**+7 / −12**) — normal, les K diffèrent : c'est le
  comportement « quasi » zéro-somme **déjà existant**, la marge ne le change pas.
- Sans marge (`mov = 1`) on aurait eu +6 / −10 → la marge a bien amplifié.
- `ratingGames` : A → 16, B → 9.

---

### TC4 — Outsider qui corrige le favori (upset + grosse marge)

Setup : **A = 1000, `ratingGames` = 8** (K 40) · **B = 1200, `ratingGames` = 15** (K 25).
A gagne **6-2 6-3** (`mov` = 1,165).

| Joueur | Δ attendu | newRating |
|--------|-----------|-----------|
| A (outsider vainqueur) | **+35** | 1035 |
| B (favori battu) | **−22** | 1178 |

**Vérif :** gain de A largement supérieur au TC1 (matchup égal) → cumul « battre
plus fort » + « nettement ».

---

### TC5 — Passage de niveau au 5ᵉ match

Setup : **A = 1088, `ratingGames` = 4, `level` = 2** · B = 1088 (peu importe ses matchs).
A gagne **6-4 6-4** (`mov` = 1,08).

| Attendu | Valeur |
|---------|--------|
| Δ A | `round(40 × 0,5 × 1,08)` = **+22** |
| newRating A | **1110** |
| `ratingGames` A | 5 |
| `level` A | **2 → 3** (car `ratingGames` atteint 5 et 1110 ≥ 1100) |

**Contrôle négatif :** rejouer le cas avec **`ratingGames` = 3** (→ 4 après le
match). Attendu : `rating` = 1110, `ratingDelta` = 22, **`level` reste 2** (seuil
des 5 matchs pas atteint).

> ⚠️ À noter pour le PO : sans la marge, Δ = +20 → 1108 → resterait N2. La marge
> peut donc faire basculer un joueur pile au 5ᵉ match. Comportement voulu, mais à
> connaître.

---

### TC6 — Écrêtage plancher (600) avec marge

Setup : **A = 615, `ratingGames` = 0** · **B = 620, `ratingGames` = 0**.
**B gagne 6-0 6-0** (A prend une valise, `mov` = 1,40).

| Attendu | Valeur |
|---------|--------|
| Δ brut A | `round(40 × (0 − 0,4928) × 1,40)` = **−28** |
| `ratingDelta` A (stocké) | **−28** (delta brut) |
| `rating` A | **600** (planché, pas 587) |
| `rating` B | 648 (`Δ` +28) |

**Vérif :** `ratingDelta` garde le delta brut (−28) même si `rating` est bloqué à 600.

---

### TC7 — Litige : l'ELO utilise le score **corrigé par l'admin**

1. A et B à 1000 / 0. A enregistre **6-4 6-4**, A vainqueur.
2. B **conteste** → `status = disputed`, **aucun ELO appliqué** (vérifier : `ratingDelta` = 0, `rating` = 1000 pour les deux).
3. Admin `POST /api/v1/admin/matches/:id/resolve` avec
   `{ "winnerRole": "host", "scoreHost": "6-0 6-0", "scoreGuest": "0-6 0-6" }`.

| Attendu | Valeur |
|---------|--------|
| `mov` utilisé | **1,40** (déduit du **6-0 6-0** corrigé, pas du 6-4 6-4 initial) |
| Δ A / Δ B | **+28 / −28** |
| `Match.status` | `confirmed` · `scoreHost` = `6-0 6-0` |

---

### TC8 — Score en 3 sets (parsing)

A et B à 1000 / 0. A (hôte) gagne, score hôte **`4-6 6-3 7-5`**
(jeux : hôte 17, invité 14 → `mov` = 1,039).

| Attendu | Valeur |
|---------|--------|
| Δ A | `round(40 × 0,5 × 1,039)` = **+21** |
| Δ B | **−21** |

---

### TC9 — La marge ne protège pas une défaite (favori corrigé)

Setup : **A = 1500, `ratingGames` = 30** (K 15) · **B = 900, `ratingGames` = 30** (K 15).
**B gagne 6-0 6-1** (`mov` = 1,338).

| Joueur | Δ attendu | newRating |
|--------|-----------|-----------|
| A (favori battu à plate couture) | **−19** | 1481 |
| B | **+19** | 919 |

**Vérif :**
- Δ A **reste négatif** — la marge amplifie la perte, elle ne l'inverse jamais.
- Sans marge : Δ A ≈ −15 → la « valise » a coûté 4 points de plus.
- `level` A : 1481 < 1500 → **reste N4** (n'était N5 qu'à ≥ 1500).

---

### TC10 — Victoire très serrée ≈ calcul de base

A et B à 1000 / 0. A gagne **`7-6 6-7 7-6`** (jeux 20–19 → `mov` = 1,01).

| Attendu | Valeur |
|---------|--------|
| Δ A / Δ B | **+20 / −20** (comme `mov` = 1) |

**Vérif :** une victoire au bout du suspense n'est pas dévaluée — `mov` ≥ 1 toujours.

---

## 4. Grille de recette

| # | Cas | Δ A | Δ B | Autres vérifs | OK ? |
|---|-----|-----|-----|---------------|------|
| TC1a | 6-0 6-0, égal | +28 | −28 | somme = 0 · level inchangé | ☐ |
| TC1b | 6-3 6-4, égal | +22 | −22 | | ☐ |
| TC1c | 7-6 7-6, égal | +21 | −21 | | ☐ |
| TC2 | score illisible (litige) | +20 | −20 | pas de NaN / plantage | ☐ |
| TC3 | favori 1200 corrige 1000, 6-1 6-2 | +7 | −12 | K différents → somme ≠ 0 (normal) | ☐ |
| TC4 | outsider 1000 bat 1200, 6-2 6-3 | +35 | −22 | | ☐ |
| TC5 | 5ᵉ match, 6-4 6-4 | +22 | — | rating 1110 · **level 2→3** | ☐ |
| TC5' | 4ᵉ match (contrôle) | +22 | — | rating 1110 · **level reste 2** | ☐ |
| TC6 | plancher, B gagne 6-0 6-0 | −28 (brut) | +28 | `rating` A = 600 · `ratingDelta` A = −28 | ☐ |
| TC7 | litige résolu, score corrigé 6-0 6-0 | +28 | −28 | mov du score **corrigé** · status confirmed | ☐ |
| TC8 | 3 sets `4-6 6-3 7-5` | +21 | −21 | parsing 3 sets OK | ☐ |
| TC9 | favori 1500 battu 6-0 6-1 | −19 | +19 | Δ A reste négatif · level A reste N4 | ☐ |
| TC10 | `7-6 6-7 7-6` très serré | +20 | −20 | mov ≈ 1 | ☐ |

**Tolérance :** ±1 sur les deltas (arrondis). Au-delà → bug.

---

## 5. Retour arrière si besoin

`MOV_SLOPE = 0` dans `elo.ts` → `mov` vaut toujours 1 → comportement strictement
identique à avant la feature (aucune autre modif nécessaire).
