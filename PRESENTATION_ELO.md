# Comment ton niveau se calcule, match après match

> Support de présentation — moteur de niveau ATC (Abidjan Tennis Community)
> Source de vérité : `apps/api/src/modules/matches/elo.ts` + `matches.service.ts → applyEloUpdate()`

Les 5 dots de ton profil ne sont plus une case cochée à l'inscription. Ils sortent
d'un classement à la **ELO** — le même principe qu'aux échecs et au classement ITF.

| N1 | N2 | N3 | N4 | N5 |
|----|----|----|----|----|
| Débutant | Intermédiaire | Avancé | Compétiteur | Professionnel |

---

## 1. Le principe — un score caché, un niveau visible

Chaque joueur porte un **rating** : un nombre entre **600 et 2000**, invisible dans
l'app. Tout le monde démarre à **1000**, quel que soit le niveau annoncé au départ.

Après chaque match **confirmé par les deux joueurs**, le rating du gagnant monte et
celui du perdant descend. Les **5 dots** affichés sur le profil sont juste une
traduction de ce rating par tranches :

| Rating | Niveau |
|--------|--------|
| 600 – 899 | N1 |
| 900 – 1099 | N2 |
| 1100 – 1299 | N3 |
| 1300 – 1499 | N4 |
| 1500 et + | N5 |

> Le rating exact reste interne. Un joueur voit ses dots, son historique et ses
> stats — pas le chiffre brut. Ça évite la course au point et les discussions sur
> « 3 points d'écart ».

---

## 2. La formule — ce que rapporte une victoire dépend de l'adversaire

**Étape 1 — la probabilité de victoire** (à partir de l'écart de rating) :

```
E = 1 / ( 1 + 10^((adversaire − moi) / 400) )
```

> 400 points d'écart ≈ 1 chance sur 10 de l'emporter.

**Étape 2 — l'ajustement du rating** :

```
nouveau rating = rating + K × ( S − E )
```

- `S = 1` si victoire, `0` si défaite
- `K` = pas d'ajustement (voir section 3)

La logique : **battre plus fort que soi rapporte beaucoup, battre plus faible
rapporte peu. Perdre contre plus faible coûte cher.**

### Exemple — deux joueurs à égalité (1000 vs 1000, K = 40)

| Joueur | Calcul | Résultat |
|--------|--------|----------|
| Gagnant | 1000 + 40 × (1 − 0,5) | **+20 → 1020** |
| Perdant | 1000 + 40 × (0 − 0,5) | **−20 → 980** |

### Exemple — un outsider crée la surprise (1000 bat 1200, K = 40)

| Joueur | Contexte | Résultat |
|--------|----------|----------|
| Outsider (1000) | n'avait que ~24 % de chances | **+30 → 1030** |
| Favori (1200) | était donné à ~76 % | **−30 → 1170** |

> Somme quasi nulle : les points gagnés par l'un sont les points perdus par
> l'autre. Le système ne crée pas de points.

### La marge du score compte aussi

Le résultat seul ne dit pas tout : gagner **6-0 6-0** n'est pas gagner **7-6 7-6**.
On multiplie l'ajustement par un **facteur de marge** calculé sur la somme des jeux,
entre **×1,0** (match serré) et **×1,4** (correction sèche) :

| Score | Facteur |
|-------|---------|
| 6-0 6-0 | ×1,40 |
| 6-2 6-2 | ×1,20 |
| 6-4 7-5 | ×1,07 |
| 7-6 7-6 | ×1,03 |

Le même facteur s'applique aux deux joueurs → la somme reste quasi nulle. Une
victoire serrée reste une victoire pleine, jamais dévaluée.

---

## 3. Le facteur K — plus tu as de matchs, plus ton niveau est stable

Le facteur **K** fixe l'amplitude d'un ajustement. Élevé au début — pour trouver
vite ton vrai niveau — puis il se resserre.

| Matchs joués | K | Effet |
|--------------|---|-------|
| 0 – 9 | **40** | Calibrage rapide, gros mouvements |
| 10 – 29 | **25** | Stabilisation progressive |
| 30 et + | **15** | Joueur établi, variations fines |

> À égalité de rating : une victoire vaut **+20** avec K = 40, mais seulement
> **+8** avec K = 15. Un joueur confirmé ne dégringole pas sur un mauvais match.

---

## 4. Le simulateur — quelques matchs pour se faire une idée

Point de départ commun : deux joueurs.

**Awa** — rating 1180, 12 matchs joués  ·  **Koffi** — rating 1290, 6 matchs joués

| Si… | Awa | Koffi |
|-----|-----|-------|
| **Awa gagne** (elle était à ~35 %) | K 25 · **+16 → 1196** | K 40 · **−26 → 1264** |
| **Koffi gagne** (il était à ~65 %) | K 25 · **−9 → 1171** | K 40 · **+14 → 1304** |

Ce qu'on lit dessus :
- Koffi, avec seulement 6 matchs (K 40), bouge deux fois plus qu'Awa à résultat égal.
- Une victoire d'Awa contre plus fort qu'elle lui rapporte gros (+16) ; si elle
  perd le match attendu à l'envers, elle ne perd que −9.
- En gagnant, Koffi passe la barre des 1300 → il monte à **N4**.

> La version interactive (artboard / page web) permet de régler soi-même les
> ratings, le nombre de matchs et le vainqueur — le calcul est exactement celui
> de l'application, seuil des 5 matchs inclus.

---

## 5. Les garde-fous — ce qui protège le classement

- **Le niveau ne bouge qu'à partir du 5ᵉ match confirmé.** Avant, on garde le
  niveau annoncé à l'inscription — un seul match ne fait basculer personne.
- **Seuls les matchs confirmés par les deux joueurs comptent.** Un score contesté
  est mis en attente, puis tranché par un admin — et alors seulement pris en
  compte, avec le même barème.
- **Rating borné entre 600 et 2000.** Impossible de tomber ou de monter à l'infini.
- **Le niveau déclaré n'avantage personne au départ.** Tout le monde à 1000 : le
  classement se construit uniquement sur les résultats.
- **Pas de recalcul rétroactif, pas de pénalité d'inactivité** pour l'instant — le
  moteur reste simple et lisible.

---

## À retenir

1. **Un rating caché (600–2000), cinq dots visibles.** Départ commun à 1000.
2. **Battre plus fort rapporte gros, battre plus faible rapporte peu** — et
   l'inverse pour les défaites.
3. **Les nouveaux bougent vite (K 40), les habitués se stabilisent (K 25 puis 15).**
4. **Ton niveau se fige jusqu'à 5 matchs confirmés**, puis suit ton rating.

---

*Libellés des 5 niveaux éditables par un admin (table `Level`, `GET /api/v1/levels`) ;
seules les bornes de rating vivent dans le code.*