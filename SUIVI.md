# ATC — Suivi Produit

> Dernière mise à jour : 2026-05-22 (session 4)

---

## Légende des statuts

| Statut | Signification |
|--------|---------------|
| ✅ Terminé | Livré et fonctionnel |
| 🚧 En cours | En développement actif |
| 🔍 À vérifier | Codé mais non testé / à valider |
| 📋 Backlog | Planifié, pas encore commencé |
| 💡 Idée | À discuter, pas encore priorisé |
| ⏸️ Bloqué | En attente d'un prérequis |

---

## Sprint 1 — Fondations & Auth ✅

| Tâche | Statut | Notes |
|-------|--------|-------|
| Setup monorepo pnpm (apps/web, apps/api, libs/shared) | ✅ Terminé | |
| Schéma Prisma + migrations | ✅ Terminé | User, Match, DispoPost, MatchRequest, Notification, QuickMatch |
| Auth signup / login (JWT access + refresh) | ✅ Terminé | bcrypt, Passport.js |
| Guards Angular (authGuard) | ✅ Terminé | |
| Intercepteur HTTP (ajout du token) | ✅ Terminé | |
| Layout responsive sidebar / bottom nav | ✅ Terminé | Desktop sidebar fixe, mobile bottom nav 4 tabs |

---

## Sprint 2 — Design System & UI ✅

| Tâche | Statut | Notes |
|-------|--------|-------|
| Design system Apple (noir/blanc/bleu `#0071E3`) | ✅ Terminé | Variables CSS globales, Inter font |
| Composants partagés (avatar, badge online, level-dots, spinner) | ✅ Terminé | |
| Dashboard avec hero sombre + stats + actions rapides | ✅ Terminé | Stats à connecter aux vraies données |
| Page membres — liste avec recherche + filtres | ✅ Terminé | Recherche temps réel, filtre niveau, filtre online |
| Page membres — pagination | ✅ Terminé | |
| Détail membre — style ATP (hero sombre + stats bar) | ✅ Terminé | Victoires, défaites, % victoire, niveau |
| Page profil — vue + mode édition | ✅ Terminé | |
| Upload avatar — Cloudinary | ✅ Terminé | multer mémoire → Cloudinary, crop 400x400 face |

---

## Sprint 3 — Matchmaking ✅

| Tâche | Statut | Notes |
|-------|--------|-------|
| Page match finder — feed des annonces | ✅ Terminé | Filtres type/court/date |
| Créer une annonce de dispo (DispoPost) | ✅ Terminé | |
| Supprimer sa propre annonce | ✅ Terminé | |
| Demander à rejoindre une annonce | ✅ Terminé | Bouton "Rejoindre" → statut en attente en temps réel |
| Accepter / refuser une demande | ✅ Terminé | UI dans onglet "Mes annonces" avec liste des demandeurs |
| Retrait de l'annonce du feed après acceptation | ✅ Terminé | Filtre `requests: { none: { status: 'accepted' } }` |
| Ruban créateur (nb demandes en attente) | ✅ Terminé | Banner orange + badge sur l'onglet |
| Ruban accepté (match confirmé) | ✅ Terminé | Banner vert avec lien vers Mes matchs |
| Route `/matchmaking` + nav | ✅ Terminé | |

---

## Sprint 4 — Flow central ✅

> Objectif : permettre à deux joueurs de s'organiser pour jouer un vrai match.

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Calendrier de disponibilités (`/availability`) | 🔴 Haute | ✅ Terminé | Grille CSS hebdomadaire, optimistic toggle, API upsert |
| Page Mes matchs (`/my-matches`) | 🔴 Haute | ✅ Terminé | Onglets À venir / Défis / Historique |
| Notifications backend (service + routes + hooks) | 🔴 Haute | ✅ Terminé | Polling 30s, types : match_request / confirmed / declined / score_to_validate / score_confirmed / score_disputed |
| Cloche flottante (fab fixe sur toute l'app) | 🔴 Haute | ✅ Terminé | Badge non-lus, navigate vers page notifications |
| Page `/notifications` dédiée | 🔴 Haute | ✅ Terminé | Liste, icônes colorées, clic = mark read + navigation contextuelle |
| Dashboard — stats réelles depuis la BDD | 🟡 Moyenne | 📋 Backlog | Compter matchs/victoires depuis la table Match |

---

## Sprint 5 — Résultats & Validation ✅

> Cycle complet : *publier dispo → demander → accepter → jouer → saisir le score → validation adversaire → historique*

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Match rapide (défi direct entre membres) | 🔴 Haute | ✅ Terminé | `QuickMatch`, onglet Défis dans /my-matches, accept/decline |
| Onglet "À venir" — matchs dispo + quick matches | 🔴 Haute | ✅ Terminé | Fenêtre 7 jours, rôle host/guest, source dispo/quick |
| UI saisie du score — formulaire par sets | 🔴 Haute | ✅ Terminé | Picker 1/2/3 sets, saisie a–b par set, vainqueur auto-calculé, max 7 |
| Endpoint `POST /matches` (enregistrer résultat) | 🔴 Haute | ✅ Terminé | Dispo-based et quick-based, vérifie rôle organisateur |
| Validation du score par l'adversaire | 🔴 Haute | ✅ Terminé | `PATCH /matches/:id/validate`, status `pending → confirmed / disputed` |
| Section "En attente de confirmation" (organisateur) | 🔴 Haute | ✅ Terminé | Score soumis mais pas encore validé, visible par le soumetteur |
| Section "Score à valider" (adversaire) | 🔴 Haute | ✅ Terminé | Badge orange sur onglet Historique, boutons Confirmer / Contester |
| Section "Contestés" | 🟡 Moyenne | ✅ Terminé | Matchs `disputed` visibles par les deux joueurs avec message admin |
| Notifs `score_to_validate` / `score_confirmed` / `score_disputed` | 🔴 Haute | ✅ Terminé | Labels, icônes et navigation corrects |
| Historique filtré sur matchs `confirmed` uniquement | 🔴 Haute | ✅ Terminé | `confirmedHistory()` computed signal |
| Dashboard stats réelles (victoires, matchs joués) | 🟡 Moyenne | ✅ Terminé | `GET /matches/me/stats` → matchesPlayed, wins, losses, winRate, upcomingCount, membersTotal |
| Dashboard — prochain match affiché | 🟡 Moyenne | ✅ Terminé | Card cliquable vers /my-matches avec adversaire, date, court |
| Dashboard — 4 accès rapides | 🟡 Moyenne | ✅ Terminé | Trouver un match, Mes matchs (avec compteur à venir), Annuaire, Mes dispos |
| Affichage score historique — scoreboard ATP | 🟡 Moyenne | ✅ Terminé | 2 rangées (moi / adversaire), colonne par set, set gagné en vert, set perdu en gris |
| Stats sur le profil membre (W/L, % victoire) | 🟡 Moyenne | 📋 Backlog | Page détail membre — données actuellement statiques |
| Auto-validation après 48h (score sans réponse) | 🟡 Moyenne | 📋 Backlog | Cron job ou check à la connexion |
| Interface admin pour gérer les scores contestés | 🟡 Moyenne | 📋 Backlog | Pour l'instant : message "un admin va traiter ce litige" |

---

## Sprint 6 — Niveau dynamique (ELO) ✅

> Remplacer le niveau auto-déclaré par un rating calculé à partir des matchs confirmés.

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Migration Prisma (`rating`, `ratingGames` sur User) | 🔴 Haute | ✅ Terminé | `rating INT DEFAULT 1000`, `ratingGames INT DEFAULT 0` |
| Rating initial identique pour tous (1000) | 🔴 Haute | ✅ Terminé | Niveau déclaré n'avantage plus personne au démarrage |
| Service `applyEloUpdate()` — formule ELO + K-factor | 🔴 Haute | ✅ Terminé | K=40 (<10 matchs) / K=25 (10-29) / K=15 (30+), transaction atomique |
| Mise à jour `level` calculé après chaque match confirmé | 🔴 Haute | ✅ Terminé | `ratingToLevel()` — level déclaré conservé pendant les 5 premiers matchs |
| Seuil 5 matchs avant classement public | 🔴 Haute | ✅ Terminé | `ratingGames >= 5` — évite qu'un faux expert soit #1 dès l'inscription |
| Page classement `/rankings` | 🔴 Haute | ✅ Terminé | Tableau ATP : rang, joueur, J/V/D/%, rating coloré par niveau |
| Carte "Ma position" dans le classement | 🟡 Moyenne | ✅ Terminé | Visible uniquement si ≥ 5 matchs confirmés |
| Classement dans sidebar + mobile nav | 🟡 Moyenne | ✅ Terminé | Icône trending, 5e onglet mobile |
| Stats profil membre (W/L, % victoire) | 🟡 Moyenne | 📋 Backlog | Page `/members/:id` — données actuellement statiques |

---

## Sprint 7 — Temps réel 📋

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Socket.IO côté frontend (connexion auth) | 🔴 Haute | 📋 Backlog | Socket.IO installé côté API, non branché côté Angular |
| Notifications push en temps réel (remplace polling) | 🟡 Moyenne | 📋 Backlog | Dépend Socket.IO front — polling 30s suffit pour le MVP |
| Online status temps réel (member:online / offline) | 🟡 Moyenne | 📋 Backlog | Dépend Socket.IO front |
| Mise à jour du feed matchmaking en live (dispo:new) | 🟡 Moyenne | 📋 Backlog | Dépend Socket.IO front |

---

## Sprint 8 — Communauté 💡

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Messagerie 1-to-1 | 🟡 Moyenne | 💡 Idée | Socket.IO, pas de modèle Prisma encore |
| Page communauté (news, événements) | 🟢 Basse | 💡 Idée | |
| Carte des courts / joueurs | 🟢 Basse | 💡 Idée | Mapbox prévu dans la stack |
| Classement & ELO des joueurs | 🟢 Basse | ✅ Terminé | Implémenté Sprint 6 |

---

## Sprint 9 — Tournois & Monétisation 💡

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Création et gestion de tournois | 🟢 Basse | 💡 Idée | Nouveau modèle Prisma nécessaire |
| Réservation de courts | 🟢 Basse | 💡 Idée | |
| Paiement cotisation (CinetPay / Wave) | 🟢 Basse | 💡 Idée | Mobile money CI |
| Vérification téléphone (+225, Orange CI SMS) | 🟢 Basse | 💡 Idée | Twilio ou Orange CI API |

---

## Sprint 10 — Mobile & DevOps 💡

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| App mobile Ionic/Capacitor | 🟢 Basse | 💡 Idée | Réutiliser le code Angular |
| Docker Compose en dev | 🟢 Basse | 💡 Idée | postgres + redis + api + web |
| CI/CD GitHub Actions | 🟢 Basse | 💡 Idée | lint + test + deploy |
| Sentry monitoring | 🟢 Basse | 💡 Idée | |
| Tests E2E Playwright (signup → match) | 🟢 Basse | 💡 Idée | Flows critiques |

---

## Bugs connus / Dette technique

| Problème | Sévérité | Statut |
|----------|----------|--------|
| Online status statique (pas mis à jour en temps réel) | 🟡 Moyenne | 📋 À corriger au Sprint 6 |
| Stats dashboard (victoires, matchs) toujours à 0 | 🟡 Moyenne | 📋 À corriger Sprint 5 backlog |
| Matchs passés sans score (>7 jours) restent dans "À venir" | 🟡 Moyenne | 📋 À décider : auto-annulation ou fenêtre élargie |
| Pas d'auto-validation des scores après 48h | 🟡 Moyenne | 📋 Backlog Sprint 5 |

---

## Prochaine action recommandée

> **Stats profil membre + angles morts critiques**
> Le moteur ELO et le classement sont opérationnels. Les priorités suivantes :
> 1. **Stats profil membre** — brancher W/L/% victoire + rating sur la page `/members/:id` (endpoint `GET /members/rankings` contient déjà les données)
> 2. **Matchs limbes >7 jours** — les matchs passés sans score disparaissent de "À venir" et ne peuvent plus être scorés ; décider : fenêtre élargie ou onglet "À scorer"
> 3. **Auto-validation 48h** — score soumis sans réponse après 48h → confirmé automatiquement (cron ou check à la connexion)
> 4. **Score contesté sans résolution** — définir le flow admin ou permettre une re-soumission
