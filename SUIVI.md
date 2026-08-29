# ATC — Suivi Produit

> Dernière mise à jour : 2026-08-27 (session 5 — déploiement, clubs/niveaux en base, temps réel)

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
| Connexion Google (OAuth) | ✅ Terminé | `POST /auth/google` : ID token Google Identity Services vérifié serveur (`google-auth-library`), compte créé/relié (niveau 1, bannière « complète ton profil » → `/profile?bienvenue=1`). `User.passwordHash` nullable + `googleId` (migration `20260829140000_google_auth`). Bouton `<app-google-auth-button>` sur login+signup, masqué si `GOOGLE_CLIENT_ID` / `googleClientId` non configurés |
| Guards Angular (authGuard) | ✅ Terminé | |
| Intercepteur HTTP (ajout du token) | ✅ Terminé | |
| Layout responsive sidebar / bottom nav | ✅ Terminé | Desktop sidebar fixe, mobile bottom nav 4 tabs |

---

## Sprint 2 — Design System & UI ✅

| Tâche | Statut | Notes |
|-------|--------|-------|
| Design system Apple (noir/blanc/bleu `#0071E3`) | ⚠️ Remplacé | Palette client « premium tennis lifestyle » (ATC Green + warm off-white) — voir § Identité couleur |
| Composants partagés (avatar, badge online, level-dots, spinner) | ✅ Terminé | |
| ~~Dashboard~~ → **Page d'accueil (grille de widgets)** + **Mon profil unifié** | ✅ Terminé | `/accueil` = lanceur de widgets illustrés (Créer une annonce, Membres, Classement, Mes matchs, Dispos, Profil). `/profile` = infos + stats + prochain match du joueur connecté + édition. Route `/dashboard` supprimée. Photos sur les héros login/signup uniquement |
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
| ~~Calendrier de disponibilités (`/availability`)~~ | — | 🗑️ Retiré | Feature supprimée (aoû. 2026) : grille privée jamais exposée aux autres, sans impact sur l'annuaire ni le matchmaking. Les annonces (`DispoPost`) restent le seul mécanisme de dispo. Table `Availability` droppée (migration `20260829120000_drop_availability`) |
| Page Mes matchs | 🔴 Haute | ✅ Terminé | Onglets À venir / Défis / Historique |
| Fusion Matchmaking + Mes matchs → `/matchs` | 🟢 Basse | ✅ Terminé | `MatchesHubComponent` : segment « Trouver un adversaire » / « Mes matchs » (query `vue`). `/matchmaking` et `/my-matches` redirigent. 1 seule entrée nav |
| Notifications backend (service + routes + hooks) | 🔴 Haute | ✅ Terminé | Polling 30s, types : match_request / confirmed / declined / score_to_validate / score_confirmed / score_disputed |
| Cloche flottante (fab fixe sur toute l'app) | 🔴 Haute | ✅ Terminé | Badge non-lus, navigate vers page notifications |
| Page `/notifications` dédiée | 🔴 Haute | ✅ Terminé | Liste, icônes colorées, clic = mark read + navigation contextuelle |
| Dashboard — stats réelles depuis la BDD | 🟡 Moyenne | 📋 Backlog | Compter matchs/victoires depuis la table Match |
| Carte du terrain d'un match | 🟡 Moyenne | ✅ Terminé | Table `Court` admin-éditable (nom, zone, adresse, `lat`/`lng`) + `GET /api/v1/courts` + onglet admin « Terrains ». `CourtMapService` + `<app-court-map>` (plan OpenStreetMap sans clé API + lien itinéraire Google/Waze/Plans, repli recherche par nom). Clic sur le terrain d'un match (feed, à venir, historique, défis) ouvre la carte. Migration `20260829130000_courts` (9 terrains d'Abidjan géocodés en approximatif). Les sélecteurs de terrain (annonce, défi, préférences) tirent désormais du catalogue |

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
| Interface admin pour gérer les scores contestés | 🟡 Moyenne | ✅ Terminé | Onglet « Litiges » dans /admin — `POST /admin/matches/:id/resolve` (choix vainqueur + correction score → `confirmed` + ELO + notif `score_resolved`) |

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

## Sprint 7 — Temps réel ✅

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Socket.IO côté frontend (connexion auth) | 🔴 Haute | ✅ Terminé | `SocketService` (token JWT dans le handshake), reconnexion infinie, handlers ré-appliqués à chaque reconnexion |
| Notifications push en temps réel (remplace polling) | 🟡 Moyenne | ✅ Terminé | `notification:new` → ajout live ; `NotificationsService.open()` marque lu + navigue vers l'événement (payload dispoId/quickMatchId/matchId) |
| Online status temps réel (member:online / offline) | 🟡 Moyenne | ✅ Terminé | `PresenceService` : `presence:sync` au connect, `member:online`/`offline` en broadcast, compteur de sockets par user (multi-onglets). `resetPresence()` au boot. Le flag `User.online` reste un fallback best-effort. Affiché sur annuaire + fiche membre |
| Mise à jour du feed matchmaking en live (dispo:new) | 🟡 Moyenne | ✅ Terminé | `emitToAll('dispo:new')` à la création ; le feed insère la carte si elle passe les filtres actifs, avec animation d'apparition |

> Testé en intégration (2 clients socket) : sync présence, online/offline broadcast, résilience si le write DB `online` échoue.

**Reste hors périmètre temps réel (backlog)** : messagerie 1-to-1 (Sprint 8), présence « en train d'écrire », accusés de lecture.

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

## Sprint 10 — Mobile & DevOps 🟡

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Déploiement prod | 🔴 Haute | ✅ Terminé | Neon (DB) + Render (API, `render.yaml`) + Vercel (front, `apps/web/vercel.json`, rewrite `/api/*`). Voir `DEPLOY.md`. Tous en tier gratuit |
| App mobile Ionic/Capacitor | 🟢 Basse | 💡 Idée | Réutiliser le code Angular |
| Docker Compose en dev | 🟢 Basse | 💡 Idée | postgres + redis + api + web |
| CI/CD GitHub Actions | 🟡 Moyenne | 📋 Backlog | lint + test + build sur PR — **pas encore fait**, les 2 builds ont déjà cassé une fois |
| Sentry monitoring | 🟡 Moyenne | 📋 Backlog | DSN prod à câbler ; logs Render perdus au redémarrage |
| Tests E2E Playwright (signup → match) | 🟡 Moyenne | 📋 Backlog | Couverture tests quasi nulle (seul `elo.test.ts`) |
| « Se connecter avec Apple » | 🟢 Basse | 💡 Idée (reporté) | Même schéma que Google (`appleId`, `/auth/apple`, `apple-signin-auth`). Nécessite compte Apple Developer 99 $/an + `client_secret` JWT à régénérer ≤ 6 mois + gérer « nom envoyé 1 seule fois » + e-mail relais privé. ~1 j |

---

## Clubs & Niveaux en base (session 5, hors roadmap initiale) ✅

| Tâche | Statut | Notes |
|-------|--------|-------|
| Table `Club` (11 clubs d'Abidjan seedés + "autre") | ✅ Terminé | `active`, `sortOrder` — éditable par un admin |
| Table `Level` (5 lignes : code, nom, profil, jeu) | ✅ Terminé | Libellés inclusifs : Débutant·e / Initié·e / Intermédiaire / Avancé·e / Compétition. Bornes ELO restent dans `elo.ts` |
| `User.club` (texte) → `User.clubId` (FK) | ✅ Terminé | Migration `20260827160000_clubs_and_levels` |
| API `GET /clubs`, `GET /levels` (publics) | ✅ Terminé | module `reference` |
| Front : `ReferenceService`, `<select>` club groupé par zone, sélecteur de niveau explicatif, panneau « Comprendre les niveaux » | ✅ Terminé | |
| Interface admin CRUD clubs/niveaux | ✅ Terminé | Onglets « Clubs » et « Niveaux » dans /admin (voir section Espace admin) |

---

## Espace admin (session 6) ✅

| Tâche | Statut | Notes |
|-------|--------|-------|
| `User.role` (`member` \| `admin`) | ✅ Terminé | Migration `20260827180000_user_role`. Promotion : `pnpm --filter @atc/api exec tsx prisma/set-role.ts <email> admin` (ou `UPDATE "User" SET role='admin'` sur Neon) |
| Middleware `requireAdmin` + `adminGuard` Angular | ✅ Terminé | `passport.ts` sélectionne le rôle ; garde front force un `/auth/me` au rechargement |
| `role` dans les réponses `login` / `signup` / `me` | ✅ Terminé | `AuthStore.isAdmin()` |
| Module API `admin` (`/api/v1/admin/*`) | ✅ Terminé | Toutes routes derrière `authenticate + requireAdmin` |
| Onglet **Litiges** — résoudre un score contesté | ✅ Terminé | `GET /admin/matches/disputed`, `POST /admin/matches/:id/resolve` |
| Onglet **Clubs** — CRUD | ✅ Terminé | create / update / delete (delete bloqué si des membres y sont rattachés → 409, désactiver plutôt) |
| Onglet **Niveaux** — édition code/nom/profil/jeu | ✅ Terminé | `PATCH /admin/levels/:level` |
| Onglet **Membres** — promouvoir / rétrograder admin | ✅ Terminé | `PATCH /admin/members/:id/role`, auto-rétrogradation interdite |
| Lien « Administration » dans la sidebar | ✅ Terminé | Visible uniquement si `isAdmin()` |

**Admin actuel** : `guyaxelsomian@gmail.com` (Axel Somian).

---

## Bugs connus / Dette technique

| Problème | Sévérité | Statut |
|----------|----------|--------|
| Online status statique | 🟡 Moyenne | ✅ Corrigé (Sprint 7 — `PresenceService`) |
| Stats dashboard (victoires, matchs) toujours à 0 | 🟡 Moyenne | ✅ Corrigé (Sprint 5 — `GET /matches/me/stats`) |
| Matchs passés sans score (>7 jours) restent dans "À venir" | 🟡 Moyenne | 📋 À décider : auto-annulation ou fenêtre élargie |
| Pas d'auto-validation des scores après 48h | 🟡 Moyenne | 📋 Backlog |
| Aucun test métier, aucune CI | 🔴 Haute | 📋 À faire — les 2 builds ont déjà cassé |
| Rate-limiting seulement sur auth ; contournable derrière Cloudflare/CGNAT | 🟠 Moyenne | 📋 Backlog (déplacer au niveau Cloudflare) |
| Pas de sanitization HTML sur `bio` / `note` | 🟠 Moyenne | 📋 Backlog |
| Perf : endpoints DB plafonnent ~15 req/s (Render↔Neon sur 2 continents) | 🟡 Moyenne | 📋 Co-localiser + cacher `/clubs` `/levels` |

---

## Prochaine action recommandée

> **Consolider avant d'ajouter des features** — le produit est déployé et le temps réel
> est en place, mais il n'y a aucun filet.
> 1. **CI GitHub Actions** (lint + test + build sur PR) — priorité n°1, les builds ont déjà cassé
> 2. **Perf** : co-localiser Render et Neon (même région) + cache mémoire/CDN sur `/clubs` et `/levels`
> 3. **Sanitization** de `bio` / `note` à l'entrée (Zod + strip HTML)
> 4. **Auto-validation 48h** des scores (cron ou check à la connexion) — sinon l'ELO se fige
> 5. **Matchs limbes >7 jours** — décider : fenêtre élargie ou onglet "À scorer"
> 6. **Stats profil membre** — brancher W/L/% + rating sur `/members/:id` (données déjà dispo)
