# Moteur de calcul de niveau — ATC

> Document de conception — à valider avant implémentation

---

## Objectif

Remplacer le niveau auto-déclaré (1–5 fixé à l'inscription) par un **niveau calculé automatiquement** à partir des matchs joués et confirmés. Le niveau reflète la performance réelle du joueur dans le club.

---

## Principe général : ELO adapté

On s'inspire du système ELO (échecs / tennis ITF) : chaque joueur possède un **rating numérique** interne. Après chaque match confirmé, les deux ratings sont mis à jour. Le **niveau 1–5 est déduit du rating** par tranche.

Le rating n'est pas visible directement par les joueurs — ils voient uniquement leur niveau 1–5 et leurs stats.

---

## Modèle de données — changements Prisma

```prisma
model User {
  // ...champs existants...
  rating        Int      @default(1000)  // ELO interne
  ratingGames   Int      @default(0)     // nb matchs comptabilisés
}
```

Migration SQL :
```sql
ALTER TABLE "User" ADD COLUMN "rating" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "User" ADD COLUMN "ratingGames" INTEGER NOT NULL DEFAULT 0;
```

---

## Rating initial à l'inscription

Le joueur déclare son niveau lors du signup. On initialise le rating en conséquence pour éviter de démarrer tout le monde à 1000 :

| Niveau déclaré | Rating initial |
|----------------|----------------|
| 1 — Débutant   | 800            |
| 2 — Intermédiaire | 1000        |
| 3 — Confirmé   | 1200           |
| 4 — Avancé     | 1400           |
| 5 — Expert     | 1600           |

---

## Formule ELO

### Score attendu (probabilité de victoire)
```
E_A = 1 / (1 + 10^((R_B - R_A) / 400))
```
- `R_A` = rating du joueur A avant le match
- `R_B` = rating de l'adversaire B
- `E_A` ∈ ]0, 1[ — plus on est fort, plus E_A est proche de 1

### Nouveau rating
```
R_A_new = R_A + K × (S - E_A)
```
- `S = 1` si victoire, `S = 0` si défaite
- `K` = facteur de sensibilité (voir ci-dessous)

### Facteur K — sensibilité selon l'expérience

| Matchs joués (`ratingGames`) | K  | Logique |
|-------------------------------|----|---------|
| 0 – 9                        | 40 | Calibration rapide au début |
| 10 – 29                      | 25 | Stabilisation progressive |
| 30 +                         | 15 | Joueur établi, variations plus fines |

---

## Seuils de niveau

Le niveau affiché (1–5) est calculé à partir du rating :

| Rating       | Niveau | Label         |
|--------------|--------|---------------|
| < 900        | 1      | Débutant      |
| 900 – 1099   | 2      | Intermédiaire |
| 1100 – 1299  | 3      | Confirmé      |
| 1300 – 1499  | 4      | Avancé        |
| ≥ 1500       | 5      | Expert        |

```typescript
function ratingToLevel(rating: number): number {
  if (rating < 900)  return 1;
  if (rating < 1100) return 2;
  if (rating < 1300) return 3;
  if (rating < 1500) return 4;
  return 5;
}
```

---

## Règles et garde-fous

| Règle | Détail |
|-------|--------|
| Matchs minimum | Le niveau ne change qu'après **3 matchs confirmés** (évite les sauts sur 1 seul match) |
| Rating plancher | Jamais en dessous de **600** (même si beaucoup de défaites) |
| Rating plafond | Jamais au-dessus de **2000** |
| Matchs non confirmés | Seuls les matchs `status = 'confirmed'` comptent (pas les pending/disputed) |
| Égalité | Score à égalité impossible au tennis (pas de draw) — S est toujours 0 ou 1 |

---

## Quand se déclenche le calcul ?

**Trigger : `validateMatch()` avec `action = 'confirm'`**

Dans `matches.service.ts`, après `prisma.match.update({ status: 'confirmed' })` :
1. Récupérer les ratings actuels des deux joueurs
2. Calculer les nouveaux ratings (formule ELO)
3. Calculer les nouveaux niveaux (`ratingToLevel`)
4. Mettre à jour `rating`, `ratingGames`, et `level` des deux joueurs en une transaction Prisma

```typescript
// Pseudo-code
async function applyEloUpdate(hostId: string, guestId: string, winnerId: string) {
  const [host, guest] = await Promise.all([
    prisma.user.findUnique({ where: { id: hostId }, select: { rating: true, ratingGames: true } }),
    prisma.user.findUnique({ where: { id: guestId }, select: { rating: true, ratingGames: true } }),
  ]);

  const kHost  = kFactor(host.ratingGames);
  const kGuest = kFactor(guest.ratingGames);

  const eHost  = expected(host.rating, guest.rating);
  const eGuest = expected(guest.rating, host.rating);

  const sHost  = winnerId === hostId ? 1 : 0;
  const sGuest = 1 - sHost;

  const newRatingHost  = clamp(Math.round(host.rating  + kHost  * (sHost  - eHost)),  600, 2000);
  const newRatingGuest = clamp(Math.round(guest.rating + kGuest * (sGuest - eGuest)), 600, 2000);

  await prisma.$transaction([
    prisma.user.update({ where: { id: hostId },  data: { rating: newRatingHost,  level: ratingToLevel(newRatingHost),  ratingGames: { increment: 1 } } }),
    prisma.user.update({ where: { id: guestId }, data: { rating: newRatingGuest, level: ratingToLevel(newRatingGuest), ratingGames: { increment: 1 } } }),
  ]);
}
```

---

## Exemples concrets

### Match entre égaux (rating 1000 vs 1000)
- E = 0.5 (50% chacun)
- K = 40 (débutants)
- Vainqueur : +20 pts → 1020 | Perdant : -20 pts → 980

### Faible (800) bat fort (1400)
- E_faible = 1 / (1 + 10^(600/400)) = 0.033 (3.3% de chance)
- Gain faible : K × (1 - 0.033) = 40 × 0.967 ≈ **+39 pts** → 839
- Perte fort : K × (0 - 0.967) = 15 × (-0.967) ≈ **-15 pts** → 1385

### Fort (1400) bat faible (800)
- E_fort = 0.967
- Gain fort : 15 × (1 - 0.967) ≈ **+1 pt** → 1401
- Perte faible : 40 × (0 - 0.033) ≈ **-1 pt** → 799

> Le système punit peu la défaite attendue et récompense peu la victoire attendue — comportement correct.

---

## Impact sur le reste de l'app

| Endroit | Changement |
|---------|------------|
| `POST /auth/signup` | Initialiser `rating` selon le niveau déclaré |
| `PATCH /matches/:id/validate` | Appeler `applyEloUpdate()` si `action = 'confirm'` |
| `GET /members` | Trier optionnellement par rating |
| `GET /members/:id` | Afficher rating (facultatif, à décider) |
| Page profil | Afficher le niveau calculé (déjà via `level`) |
| Annuaire | Les level-dots reflèteront le niveau réel |

---

## Ce qu'on ne fait PAS (pour l'instant)

- Pas de classement public visible (juste les level-dots)
- Pas de recalcul historique au démarrage (les matchs passés ne recalculent pas)
- Pas de decay (pénalité pour inactivité)
- Pas de saison / reset annuel

---

## Questions à valider avant implémentation

1. **Rating initial** — conserver le niveau auto-déclaré comme base, ou partir tout le monde à 1000 ?
2. **Seuil minimum de matchs** — 3 matchs avant que le niveau bouge, ou immédiatement dès le 1er ?
3. **Afficher le rating brut** — montrer le score ELO quelque part (profil, admin) ou le garder interne ?
4. **Matchs historiques** — recalculer les matchs déjà confirmés en base, ou partir de 0 ?
