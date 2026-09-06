# Carte d'enjeu — match à jouer

**But :** sur un match à venir, afficher un encart **motivant** (pas une cote de
paris) : le titre donne le ton, la ligne de points montre l'asymétrie de la
mécanique ELO (l'outsider gagne gros / risque peu, le favori l'inverse).

**Date :** 2026-09-06

---

## Comportement

Sur l'onglet **Mes matchs → À venir**, sous les infos de chaque match :

| Bande | Condition | Titre | Ton visuel |
|-------|-----------|-------|-----------|
| `outsider` | proba < 40 % | « L'occasion de créer la surprise » | liseré + fond **ATC Green** (opportunité) |
| `balanced` | 40–60 % | « Ça va se jouer sur des détails » | liseré **Sage**, neutre |
| `favorite` | proba > 60 % | « À vous de confirmer » | liseré **ocre** (alerte douce) |

Ligne de points (toujours affichée) : `Victoire +X · Défaite −Y`
(calculée avec `computeElo`, marge neutre puisque le score est inconnu).

**Le pourcentage brut n'est pas affiché** — il est dans le payload (`stakes.probability`)
pour un futur détail opt-in, mais l'UI ne montre que l'enjeu asymétrique.

### Conditions d'affichage (sinon `stakes = null`, aucun encart)

- match **simple** uniquement (le calcul est du 1v1)
- **les deux joueurs** ont ≥ 5 matchs classés (`ratingGames >= MIN_GAMES_TO_MOVE_LEVEL`)
  → avant ça tout le monde est à 1000, l'estimation n'a pas de sens
- masqué pendant la saisie du score

---

## Implémentation

### Back

| Fichier | Changement |
|---------|-----------|
| `matches/elo.ts` | + `winProbability(myRating, oppRating)` · + `matchStakes(myRating, myGames, oppRating)` → `{ probability, deltaWin, deltaLoss, band }` (fonctions pures) |
| `dispos/dispos.service.ts` | `getUpcomingForUser` enrichit chaque item d'un `stakes: MatchStakes \| null`. **Le rating brut est lu côté serveur uniquement** (requête dédiée `id/rating/ratingGames`), jamais renvoyé au client — le payload `opponent` reste `id/name/initials/avatarUrl/level`. |

### Front

| Fichier | Changement |
|---------|-----------|
| `core/models/match.model.ts` | + `StakesBand`, `MatchStakes`, champ `stakes` sur `UpcomingMatch` |
| `my-matches.component.ts` | table `STAKES_COPY` (titre + sous-titre + ton par bande) · `stakesView(s)` |
| `my-matches.component.html` | encart `.stakes` dans `.match-body` |
| `my-matches.component.css` | `.stakes` + 3 variantes `.stakes--{outsider,balanced,favorite}` |

### Tests

`elo.test.ts` : **100 tests** (8 ajoutés — `winProbability` ×3, `matchStakes` ×5).
Couverture `elo.ts` 100 %. `tsc` API + web OK. `ng build` OK.

---

## Non fait (pistes)

- Badge profil « a battu N joueurs mieux classés » (récompense le fait de jouer
  vers le haut — cf. problème des pools fermés).
- Opt-out dans les réglages.
- Afficher la même carte sur la page d'un défi rapide reçu (avant acceptation).
