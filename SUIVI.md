# ATC — Suivi Produit

> Dernière mise à jour : 2026-11-15 — **classement façon ATP + têtes de série déployés**
> (branche `feat/classement-atp` mergée sur `master`, migrations appliquées par Render).
> Voir § « 🏆 Classement façon ATP » et § « 🏛️ Socle fédération (2026-11-08 → 11-12) » et
> § « Pour reprendre le travail » en tout dernier pour l'état exact au moment de la
> coupure (utile en particulier si tu reprends depuis une autre machine / Remote
> Control, sans accès à la mémoire locale de cette session).

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
| ~~Dashboard~~ → **Page d'accueil (grille de widgets)** + **Mon profil unifié** | ✅ Terminé | `/accueil` = lanceur de widgets illustrés (Créer une annonce, Membres, Clubs, Classement, Mes matchs, Profil). `/profile` = infos + stats + prochain match du joueur connecté + édition. Route `/dashboard` supprimée |
| Photos des 6 widgets d'accueil | ✅ Terminé | Série lifestyle ATC (`w-annonce`/`w-membres`/`w-clubs`/`w-classement`/`w-matchs`/`w-profil`.webp, ~30-60 ko). Voile allégé (dégradé vertical pesé vers le bas au lieu d'un aplat) pour laisser ressortir la photo. **Générées via ChatGPT → à remplacer par de vraies photos ATC (mêmes noms de fichiers, aucun code)** |
| Ambiance visuelle app connectée | ✅ Terminé | Filigrane « blueprint » (lignes de court, `stroke-opacity 0.07`) sur `.layout-content` → toutes les pages. Hero Deep Forest + demi-court SVG sur la page match |
| Page membres — liste avec recherche + filtres | ✅ Terminé | Recherche temps réel, filtre niveau, filtre online |
| Page membres — pagination | ✅ Terminé | |
| Détail membre — style ATP (hero sombre + stats bar) | ✅ Terminé | Victoires, défaites, % victoire, niveau |
| Page profil — vue + mode édition | ✅ Terminé | |
| Upload avatar — Cloudinary | ✅ Terminé | multer mémoire → Cloudinary, crop 400x400 face |
| Pages Connexion / Inscription — refonte mobile | ✅ Terminé | Bande photo + panneau qui remonte, inputs 16px (pas de zoom iOS), `.auth-divider` + bouton Google. Héros : `court-serve.webp` (connexion), `court-editorial.webp` (inscription — **remplacée aoû. 2026 par une photo aérienne de volée**, `background-position` calé sur le joueur). Toujours des placeholders à remplacer par de vraies photos ATC |

---

## Sprint 3 — Matchmaking ✅

| Tâche | Statut | Notes |
|-------|--------|-------|
| Page match finder — feed des annonces | ✅ Terminé | Filtres type/court/date. Refonte visuelle des cartes (aoû. 2026) : format « carte d'invitation » — identité joueur + niveau, bandeau détails (date/terrain) en ivoire, note en citation, CTA « Rejoindre ce match », lueur d'accent (sans photo, la PO n'en voulait pas à la création) |
| Créer une annonce de dispo (DispoPost) | ✅ Terminé | |
| Supprimer sa propre annonce | ✅ Terminé | |
| Demander à rejoindre une annonce | ✅ Terminé | Bouton "Rejoindre" → statut en attente en temps réel |
| Accepter / refuser une demande | ✅ Terminé | UI dans onglet "Mes annonces" avec liste des demandeurs. Modèle **1 invité par annonce** : accepter une demande refuse les autres (toutes notifiées `match_declined`). **Changer d'adversaire** (sept. 2026) : « Choisir à la place » sur une demande refusée / « Retirer » sur l'accepté → confirmation, l'ancien reçoit `match_spot_reassigned`. Depuis le passage à « 1 conversation = 1 relation » (2026-09-03), la conversation avec l'ancien invité est **conservée** (les échanges avec le nouveau vivent dans une conversation distincte) |
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
| Carte du lieu d'un match | 🟡 Moyenne | ✅ Terminé | `CourtMapService` + `<app-court-map>` (plan OpenStreetMap sans clé API + lien itinéraire Google/Waze/Plans, repli recherche par nom). Clic sur le lieu d'un match (feed, à venir, historique, défis) ouvre la carte. **Fusion Terrain → Club (aoû. 2026, retour PO)** : la table `Court`, `GET /courts` et l'onglet admin « Terrains » sont **supprimés** ; le **Club est l'unique entité « lieu »** (il porte `lat`/`lng`). Migration `20260829190000_merge_court_into_club`. Les sélecteurs (annonce, défi, préférences) listent les clubs |
| Position d'un lieu (admin) | 🟡 Moyenne | ✅ Terminé | `<app-court-picker>` : carte Leaflet dans une modale — recherche d'adresse (Nominatim), clic / repère déplaçable, `lat`/`lng` auto-remplis + adresse suggérée par géocodage inverse. Intégré au **panneau admin « Clubs »** (bloc « Placer sur la carte »). Leaflet (`~45 ko gz`) dans le chunk admin, CSS Leaflet global |
| Annuaire des clubs (`/clubs`) + widget accueil | 🟡 Moyenne | ✅ Terminé | **Refonte v2 (aoû. 2026, retour PO) : grille de cartes visuelles** — photo du club, nom, localisation, nb membres ATC, cœur favori. Plus de groupement par zone (liste à plat + recherche). Favoris = `localStorage` par appareil (`ClubFavoritesService`), favoris en tête. Placeholder = dégradé ATC + monogramme si pas de photo. Champ `Club.imageUrl` (migration `20260829170000_club_image`) rempli par upload Cloudinary admin (`POST /admin/clubs/:id/image`, dossier `atc/clubs`, recadré 800×500). Helper `lib/cloudinary.ts::uploadImage()` mutualisé avec les avatars. Widget accueil + entrée sidebar inchangés |
| Fiche club `/clubs/:slug` | 🟡 Moyenne | ✅ Terminé | `ClubDetailComponent` (route lazy). Nouveaux champs `Club` : `address`, `description`, `feesInfo` (honoraires, texte libre), `phone`, `website` (migration `20260829180000_club_profile`) — éditables dans le panneau admin Clubs. `GET /clubs/:slug` (public, 404 propre). Page = hero photo + favori, présentation, encadrés infos (adresse / honoraires / contact / site), **aperçu des 12 premiers membres** (avatars + niveau) + lien « Voir les N membres » → `/members?club=<slug>`. Décisions PO par défaut : honoraires en texte libre, aperçu membres (pas la liste complète), **carte OpenStreetMap non incluse** (reportée) |

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
| Reclassification des 5 niveaux (retour PO) | 🟡 Moyenne | ✅ Terminé | Débutant / Intermédiaire / Avancé / **Compétiteur** / **Professionnel** (au lieu de Débutant·e / Initié·e / Intermédiaire / Avancé·e / Compétition) — objectif : séparer l'amateur-compétiteur du pro. Migration `20260829160000_levels_reclassification` (contenu table `Level` uniquement). Pas d'emoji. N5 reste atteignable par l'ELO (≥ 1500). **Bug corrigé** : `applyEloUpdate` ne modifiait plus `level` correctement avant 5 matchs (il basculait au palier du rating dès le 1er match) → il ne touche plus `level` du tout avant `MIN_GAMES_TO_MOVE_LEVEL` |

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
| Socle PWA installable (prérequis push) | 🔴 Haute | ✅ Terminé | `manifest.webmanifest` (palette ATC, `display: standalone`), `pwa-icon.svg` maskable, `sw.js` minimal (aucun cache offline — juste `push` + `notificationclick`), enregistré en prod via `main.ts`. `index.html` : `<link rel=manifest>` + métas apple. `vercel.json` : `Cache-Control: no-cache` sur `/sw.js`. `environment*.ts` : `vapidPublicKey` (vide). Débloque le push iOS 16.4+ (app installée). Reste Lot 2 : clés VAPID, `PushSubscription`, `pushManager.subscribe`, envoi `web-push` côté API |
| Messagerie 1-to-1 — Lot 1 (in-app) | 🔴 Haute | ✅ En prod (2026-09-02) | Modèles `Conversation`/`ConversationParticipant`/`Message` (migration `20260902120000_messaging`). Module API `modules/messaging` (`GET /conversations`, `/conversations/:id`, `/:id/messages`, `POST /:id/messages` rate-limit 30/min, `/:id/read`, `/unread-count`, `/by-source/:source/:sourceId`). ACL sur chaque route + chaque emit. Conversation créée à l'acceptation (dispo + quick-match). Socket : `message:new` / `message:read` / `conversation:new` (callbacks ramenés dans `NgZone` — sinon pas de détection de changement). Front : `/messages` + `/messages/:id`, `MessagesService`, badge sidebar + topbar, bouton « Discuter », rappel du match en tête ET sur chaque ligne du feed. Perf : `listConversations`/`getConversation` en 1 requête SQL (LATERAL). Tests unitaires du module : encore à écrire.<br>**2026-09-03 — 1 conversation = 1 relation entre 2 joueurs** (US MVP) : `Conversation.pairKey` (2 userId triés) `@unique` à la place des liens 1:1 `dispoPostId`/`quickMatchId`. `ensureConversation(a,b)` réutilise la conversation existante, n'en crée jamais une 2ᵉ pour la paire. Le « rappel du match » est calculé à la lecture (dernier match accepté entre les 2 joueurs). Migration `20260903120000_conversation_per_pair` : fusionne les conversations en double par paire (la plus ancienne gagne, messages repointés, `lastReadAt` = min). |
| **Actualité ATC — Lots 1-3 (admin + page publique + détail)** | 🔴 Haute | 🚧 En cours (2026-09-02) | Modèle `Post` unique (tournoi/événement/partenariat/infos_tennis/atc ; statut draft→scheduled→published→archived ; migration `20260902200000_news`). Visibilité **calculée à la lecture** (`published` OU `scheduled` + `publishedAt` atteint) → aucune tâche planifiée (Render dort). Module API `modules/news` : public `/api/v1/news` (feed curseur, `/featured`, `/events/upcoming`, `/events`, `/partner-of-month`, `/:slug`) + admin `/api/v1/admin/news` (CRUD + upload image Cloudinary `atc/news`). Corps en **Markdown** rendu HTML assaini côté API (`lib/markdown.ts` : `marked` + `sanitize-html`). Push à tous à la publication. **Front** : onglet admin « Actualité » (éditeur complet) ; page publique `/actualite` (carrousel à la une scroll-snap, filtres catégories, feed 2 col + « charger plus », bandeau 3 prochains événements, carte partenaire du mois) ; détail `/actualite/:slug` (contenu, galerie, barre événement, CTA contextuel, partage natif) ; `/actualite/evenements` (calendrier). Nav : entrée sidebar + widget accueil + icône topbar mobile. **Lot 4 (RSS) fait** : modèle `RssFeed` + `Post.externalId`/`sourceUrl` (migration `20260902220000_rss`), `rss-parser`, `modules/news/rss.service` (titre + extrait + lien source uniquement, dédupe `externalId`, articles < 14 j, ≤ 5/flux, import en brouillon sauf `autoPublish`). Déclenchement : fetch-on-read throttlé 6 h (`maybeSync`) + endpoint `POST /api/v1/news/rss/sync` (header `x-rss-token`) appelé par le cron GitHub Actions `.github/workflows/rss-sync.yml` (toutes les 6 h). Admin : section « Flux RSS » dans l'onglet Actualité (CRUD flux + auto-publier + « Synchroniser maintenant »). **À configurer** : secret `RSS_SYNC_TOKEN` (Render + GitHub), liste des flux. **Reste** : recherche + filtre date (P2). |
| Messagerie 1-to-1 — Lot 2 (push) | 🟡 Moyenne | 📋 Backlog | Socle PWA ✅. Reste : clés VAPID, `PushSubscription`, `pushManager.subscribe()` + UI permission, envoi `web-push` côté API, règle « hors conversation » (présence socket par conversation), repli e-mail Maileroo débouncé |
| Page communauté (news, événements) | 🟢 Basse | 💡 Idée | |
| Carte des courts / joueurs | 🟢 Basse | 💡 Idée | Mapbox prévu dans la stack |
| Classement & ELO des joueurs | 🟢 Basse | ✅ Terminé | Implémenté Sprint 6 |

---

## Sprint 9 — Tournois & Monétisation 💡

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Création et gestion de tournois | 🔴 Haute | ✅ Terminé | Voir § « 🏛️ Socle fédération » + § « 🏆 Classement façon ATP » |
| Réservation de courts | 🟢 Basse | 💡 Idée | |
| Paiement cotisation (CinetPay / Wave) | 🟢 Basse | 💡 Idée | Mobile money CI |
| Vérification téléphone (+225, Orange CI SMS) | 🟢 Basse | 💡 Idée | Twilio ou Orange CI API |

---

## Sprint 10 — Mobile & DevOps 🟡

| Tâche | Priorité | Statut | Notes |
|-------|----------|--------|-------|
| Déploiement prod | 🔴 Haute | ✅ Terminé | Neon (DB) + Render (API, `render.yaml`) + Vercel (front, `apps/web/vercel.json`, rewrite `/api/*`). Voir `DEPLOY.md`. Tous en tier gratuit |
| App mobile Ionic/Capacitor | 🟢 Basse | 💡 Idée | Réutiliser le code Angular |
| Docker Compose en dev | 🟢 Basse | 💡 Idée | `docker-compose.yml` = postgres seul (Redis retiré, non utilisé) |
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
| Onglet **Notifications** — push à tous les membres | ✅ Terminé (2026-09-02) | `GET /admin/push/stats` (nb appareils / membres), `POST /admin/push/broadcast` (titre 80, message 300, page cible). `sendBroadcast` par lots de 50, purge des abonnements morts |
| Lien « Administration » dans la sidebar | ✅ Terminé | Visible uniquement si `isAdmin()` |

**Admin actuel** : `guyaxelsomian@gmail.com` (Axel Somian).

---

## Audit sécurité (session 7) — aucun problème critique

| Point | Sévérité | Statut |
|-------|----------|--------|
| **Injection HTML dans les e-mails transactionnels** (nom / note / score non échappés → rendu chez le destinataire) | 🟠 Moyenne | ✅ Corrigé — helper `esc()` + `subj()` dans `templates.ts`, `infoTable()` échappe toutes ses valeurs |
| Longueur non bornée : `quick-matches` `note`, `matches` `scoreHost`/`scoreGuest` | 🟢 Basse | 📋 À faire — ajouter `.max()` + regex score |
| `loginWithGoogle` accepte `email_verified !== true` (`undefined` passe) | 🟢 Basse | 📋 À faire — exiger `=== true` |
| Intercepteur front ajoute `Authorization` à **toutes** les requêtes `HttpClient` (OK aujourd'hui, tout est relatif) | 🟢 Basse | 📋 À faire — restreindre à `/api/` |
| Access token en `localStorage` (`atc_token`) | ⚪️ Info | Compromis standard SPA ; refresh token bien en cookie `HttpOnly` |
| ~~Aucun parcours « mot de passe oublié »~~ | 🔴 Haute | ✅ Fait (2026-09-03) | Modèle `PasswordResetToken` (SHA-256 du jeton, usage unique, exp. 30 min ; migration `20260903090000_password_reset`). `POST /auth/forgot-password` (réponse identique que l'e-mail existe ou non, n'envoie qu'aux comptes avec `passwordHash`) + `POST /auth/reset-password` (applique + ouvre une session). Rate-limit 5 / 15 min sur les deux. Front : `/auth/forgot-password`, `/auth/reset-password?token=`, lien sous le champ mot de passe du login. Sessions existantes non révoquées (JWT stateless) — à traiter avec la rotation de refresh token. |
| ~~Aucune vérification d'e-mail à l'inscription~~ | 🟠 Moyenne | ✅ Fait (2026-09-03) | `User.emailVerified` + modèle `EmailVerificationToken` (SHA-256, usage unique, exp. 24 h ; migration `20260903150000_email_verification`, comptes existants passés à `true`). Inscription e-mail/mdp → e-mail de confirmation (remplace l'e-mail de bienvenue), compte utilisable tout de suite ; Google + lien de compte Google + `reset-password` → `emailVerified = true` d'office. `POST /auth/verify-email` + `POST /auth/resend-verification` (rate-limit 5 / 15 min). **Durcissement J+7** : `assertEmailVerifiedForPublish` bloque `createDispo` et `challenge` (défi) au-delà de 7 j sans confirmation. Front : `/auth/verify-email?token=`, bandeau `app-verify-banner` dans le layout (fermable pour la session). |
| Bon : contrôles de propriété sur toutes les mutations, `/admin/*` derrière `requireAdmin`, Zod partout, zéro SQL brut, bcrypt 12, refresh `HttpOnly`+`secure`, double validation des scores | — | ✅ |

---

## Conformité / réglementaire (session 8, 2026-09-04)

Revue des angles morts juridiques (**pas un avis de juriste** — l'ARTCI et le statut
de l'association nécessitent un conseil local). Traité point par point.

### 🔴 Bloquant

| # | Point | Statut |
|---|-------|--------|
| **1** | **Aucune politique de confidentialité ni CGU, aucun consentement** | ✅ Fait (2026-09-04) — voir ci-dessous |
| 2 | **Déclaration ARTCI** (Loi ivoirienne n° 2013-450) du traitement, avant collecte | 📋 Formalité externe — à faire avec un conseil |
| 3 | **Transfert hors Côte d'Ivoire** (hébergement UE) à encadrer/déclarer | 📋 Idem #2 |
| 4 | **Mineurs** : `age` min 10, aucune barrière à l'inscription, messagerie ados↔adultes | 📋 Backlog — déclaration d'âge + consentement parental < 16 ans |
| 5 | **Suppression de compte + export des données** impossibles (droit à l'effacement / portabilité) | 📋 Backlog |

### 🟠 Important
6. Aucun DPA signé avec les sous-traitants (Neon, Render, Vercel, Cloudinary, Maileroo, Google, Sentry) + publier la liste.
7. E-mails sans lien de désinscription ni identité légale de l'expéditeur (lié obs. #9/#10).
8. Annuaire des membres sans information ni opt-out.
9. Aucune durée de conservation définie (comptes, messages, logs IP, jetons).
10. Aucune procédure de notification de violation de données (72 h ARTCI/CNIL).
11. Logs (IP + userId) et Sentry = données perso à déclarer + limiter dans le temps.
12. Agrégation RSS — droit voisin des éditeurs de presse (franceinfo surtout) : extraits courts, toujours liés, retrait sur demande.

### 🟡 À cadrer
13. Statut juridique de l'association (sinon responsable = personne physique).
14. AIPD justifiée (mineurs + mise en relation physique + roadmap carte des joueurs).
15. Bandeau cookies/traceurs (si Sentry activé + favoris/bookmarks).
16. Consentement photos de tiers (droit à l'image) — cadré par les CGU.
17. « Carte des joueurs » (roadmap) = géoloc utilisateurs → consentement explicite + AIPD obligatoires avant build.

### Point #1 — implémenté (2026-09-04)

- **Textes** : `/legal/confidentialite` + `/legal/cgu` (composants `features/legal/`), routes **publiques**. Bandeau « à faire relire par un juriste » en tête. Contact = `guyaxelsomian@gmail.com` (à remplacer par une adresse dédiée).
- **Version** : `apps/api/src/lib/legal.ts` `LEGAL_VERSION = '2026-09-04'`. Bumper cette constante → tous les membres doivent ré-accepter.
- **Modèle** : `User.termsAcceptedAt` + `termsVersion` (migration `20260904120000_legal_consent`, **pas de backfill** → tous les comptes existants doivent accepter au prochain accès).
- **À l'inscription e-mail/mdp** : case à cocher obligatoire (`acceptTerms: z.literal(true)`), acceptation enregistrée à la création.
- **Écran bloquant** `/legal/accept` (`LegalAcceptComponent`) : garde `termsGuard` sur le layout principal → tout membre (Google, comptes existants, ou après un bump de version) sans acceptation valide y est redirigé, aucun accès à l'app avant « J'accepte » (ou « Refuser » = déconnexion).
- **Route** : `POST /auth/accept-terms` (authentifié) → `termsAcceptedAt = now`, `termsVersion = LEGAL_VERSION`. `getMe` / login / signup renvoient `termsAccepted: boolean`.
- Liens CGU/confidentialité : footer login, sidebar, écran d'acceptation, case d'inscription.

---

## Observabilité (session 8, 2026-09-03) ✅ socle

- **Log structuré** (`lib/logger.ts`, zéro dépendance) : 1 ligne JSON par événement vers stdout/stderr, niveau via `LOG_LEVEL` (défaut `info` en prod).
- **Log de requête** (`middleware/request-log.ts`) : 1 ligne par requête HTTP à sa fin — `method, path, status, ms, userId, ip, reqId`. `reqId` renvoyé en en-tête `x-request-id` + dans le corps des 500 (un membre le donne pour retrouver la trace).
- **Gestionnaire d'erreurs** (`middleware/error.ts`) : AppError 4xx → `warn` ; 5xx / erreurs non prévues → `error` + stack + Sentry. Rejets non gérés + `uncaughtException` tracés.
- **Sentry** (`lib/sentry.ts` back, `core/observability.ts` front) : **inerte tant que `SENTRY_DSN` (Render) / `sentryDsn` (`environment*.ts`) sont vides**. Front : `ErrorHandler` Sentry + intercepteur HTTP (`error-log.interceptor`) qui remonte les 5xx / erreurs réseau.
- **`lib/bg.ts`** : helper `bg(promise, label, ctx)` pour les « fire-and-forget » — trace l'échec au lieu de l'avaler. Appliqué aux push de notification, notify messagerie, e-mails (`mailer.service`), synchro RSS, mises à jour ELO.
- **À configurer** : créer un projet Sentry (Node + Angular), poser `SENTRY_DSN` sur Render et le DSN client dans `environment.prod.ts`. Optionnel : log drain Render → Better Stack/Axiom pour la recherche + rétention.

## Bugs connus / Dette technique

| Problème | Sévérité | Statut |
|----------|----------|--------|
| Online status statique | 🟡 Moyenne | ✅ Corrigé (Sprint 7 — `PresenceService`) |
| Stats dashboard (victoires, matchs) toujours à 0 | 🟡 Moyenne | ✅ Corrigé (Sprint 5 — `GET /matches/me/stats`) |
| Matchs passés sans score (>7 jours) restent dans "À venir" | 🟡 Moyenne | 📋 À décider : auto-annulation ou fenêtre élargie |
| Pas d'auto-validation des scores après 48h | 🟡 Moyenne | 📋 Backlog |
| Aucun test métier, aucune CI | 🔴 Haute | 📋 À faire — les 2 builds ont déjà cassé |
| Rate-limiting seulement sur auth ; contournable derrière Cloudflare/CGNAT | 🟠 Moyenne | 📋 Backlog (déplacer au niveau Cloudflare) |
| Pas de sanitization HTML sur `bio` / `note` en **stockage** (l'affichage Angular échappe ; les e-mails échappent depuis sess. 7) | 🟢 Basse | 📋 Backlog |
| Perf : endpoints DB plafonnent ~15 req/s (Render↔Neon sur 2 continents) | 🟡 Moyenne | ✅ Co-localisé 2026-09-02 : Neon migré us-east-2 → eu-central-1 (même région que Render Frankfurt). `/clubs` ~750→~300 ms. Reste : cache mémoire `/clubs` `/levels`. NB pooler Neon du nouveau projet cassé → endpoint DIRECT partout |
| Photos d'illustration (accueil + héros auth) à remplacer par de vraies photos ATC | 🟢 Basse | 📋 PO — remplacement sans code |
| Clubs sans `lat`/`lng` → pas de carte sur la fiche ni sur les matchs | 🟢 Basse | 📋 L'admin pose la position sur carte dans l'onglet Clubs |

---

## Prochaine action recommandée

> **Consolider avant d'ajouter des features** — le produit est déployé et le temps réel
> est en place, mais il n'y a aucun filet.
> 1. **CI GitHub Actions** (lint + test + build sur PR) — priorité n°1, les builds ont déjà cassé
> 2. **Perf** : ~~co-localiser Render et Neon~~ ✅ fait (eu-central-1, 2026-09-02) — reste cache mémoire/CDN sur `/clubs` et `/levels`
> 3. **Sanitization** de `bio` / `note` à l'entrée (Zod + strip HTML)
> 4. **Auto-validation 48h** des scores (cron ou check à la connexion) — sinon l'ELO se fige
> 5. **Matchs limbes >7 jours** — décider : fenêtre élargie ou onglet "À scorer"
> 6. **Stats profil membre** — brancher W/L/% + rating sur `/members/:id` (données déjà dispo)

---

## Sessions 9+ (2026-09-04 → 2026-09-20) — rattrapage

Tout ce qui suit a été livré sans jamais être consigné ici. Résumé par thème :

- **ELO & enjeu de match** : marge du score prise en compte dans le calcul ELO ; **carte
  d'enjeu** sur les matchs à venir (probabilité de victoire + points en jeu), visible
  seulement en simple et quand les deux joueurs ont assez de matchs classés — voir
  `FEATURE_CARTE_ENJEU.md`, `PRESENTATION_ELO.md`, `NIVEAU_ENGINE.md`. **Le rating brut
  n'est jamais affiché**, nulle part — règle produit stricte, à respecter dans tout
  nouvel écran (y compris la refonte TenCI).
- **Badges** : socle back (13 badges, moteur de hauts faits persistés en table
  `Achievement`) + front (panneau profil + fiche membre, icône dédiée par badge, hauts
  faits en écussons collectionnables). Un bug de panneau bloqué sur le spinner (effect
  interdisant les writes en NG17) a été corrigé au passage.
- **Carte de match partageable** : image « story » générée en canvas (1080×1920) sur un
  match confirmé, partage natif WhatsApp/Instagram. Lot 1 client-only livré.
- **Messagerie** : indicateur « est en train d'écrire ».
- **EPIC Actualité** : terminé (Lots 1-4) — modèle `Post` unique, visibilité calculée à
  la lecture, admin (CRUD + programmation), page publique, détail, page événements, flux
  RSS. Plusieurs correctifs sur la publication programmée (le panneau admin ne basculait
  pas les posts échus ; tick serveur ajouté).
- **UX/UI hardening** (« améliore tout ») : focus clavier visible, `prefers-reduced-motion`
  respecté, rating masqué partout (cf. règle ci-dessus), `app-empty-state` unifié,
  primitives partagées (`stat-tile`, `section-title`, `chip`, `panel`), contraste du
  texte discret corrigé. Primitives + hiérarchie plus poussées restent à faire.
- **Mailer** : passage à **Maileroo** (remplace SendGrid mentionné dans la stack
  d'origine) ; en dev sans `MAILEROO_API_KEY`, les e-mails sont juste logués en console
  (sujet + destinataire, **pas le lien/token**) — point important pour qui veut tester
  vérif e-mail / mot de passe oublié en local ou en CI (voir `SPEC_E2E_PARCOURS.md`
  § 0.3.1). Bug corrigé : l'absence de clé en prod était avalée silencieusement.
  Gabarits alignés sur la charte ATC, script `diag-email` pour tester le rendu.
- **Perf DB** : keep-alive Neon pendant l'usage actif (anti-autosuspend du plan gratuit).
- **Divers fixes** : lien de confirmation d'e-mail cassé une fois déjà connecté ; annonce
  affichée en double dans le feed après création ; scroll horizontal sur mobile dans
  Actualité.

---

## 🔄 Pivot TenCI (annoncé 2026-11-05)

Le PO a décidé de **vendre ATC à une fédération de tennis**. Voir le détail des
décisions et de la direction visuelle proposée en tête de `CLAUDE.md` (section « Pivot
en cours — ATC devient TenCI ») — pas dupliqué ici pour éviter que les deux docs
divergent. Statut en une phrase : **renommage large (marque+domaine+code+DB) acté,
plateforme devient « officielle fédérale » (pas une marque blanche), liste précise des
demandes fédérales pas encore reçue, direction visuelle (palette navy/volt/cloud/clay +
Space Grotesk/Manrope) proposée au PO mais pas encore appliquée au code — en attente de
validation avant de toucher `styles.css`.**

**Ne pas renommer ni démarrer de dev fédéral avant d'avoir, dans l'ordre : (1) la liste
des demandes fédé, (2) la validation de la direction visuelle, (3) un plan de migration
DB si le renommage touche le schéma en prod (Neon).**

---

## Automatisation E2E post-déploiement (2026-09-20) ✅

- `.github/workflows/trigger-e2e.yml` : sur `deployment_status` réussi en environnement
  `Production` (déploiement Vercel du front), déclenche un `repository_dispatch` vers le
  repo **`Template-PW-automation`** (tests Playwright), avec l'URL de déploiement en
  payload. Secret requis côté ATC : `DISPATCH_TOKEN`.
- **Confirmé fonctionnel de bout en bout** le 2026-09-20 (run `repository_dispatch` →
  succès côté `Template-PW-automation`) après un premier aller-retour de debug.
- `SPEC_E2E_PARCOURS.md` (racine du repo) : spec complète des parcours utilisateur à
  automatiser en E2E (40+ parcours détaillés, prérequis techniques, priorisation,
  structure Playwright proposée). **Rédigée mais pas encore exploitée** — personne n'a
  encore écrit les specs Playwright elles-mêmes dans `Template-PW-automation`.

---

## 🚩 Bug ouvert — crons Actualité/RSS échouent systématiquement (découvert 2026-11-05)

En vérifiant l'état du pipeline CI le 2026-11-05, constat : les deux workflows cron liés
à l'actualité **échouent à 100% des runs**, sur un historique remontant à plusieurs
semaines (pas une régression récente) :

- `.github/workflows/publish-scheduled.yml` (*/10 min) — `POST
  /api/v1/news/rss/publish-due`
- `.github/workflows/rss-sync.yml` (*/6h) — `POST /api/v1/news/rss/sync`

L'API est saine (`GET /api/v1/levels` → 200). L'endpoint répond `401 "Token invalide"`
sans header — cohérent avec un **`RSS_SYNC_TOKEN` désaligné** entre le secret GitHub
Actions et la variable d'env Render (jamais posé côté Render, ou changé d'un côté sans
l'autre). Impact réel limité : la visibilité des articles est calculée à la lecture
(fallback déjà en place), donc le site public n'est pas cassé — mais le flip de statut
« publié » et le push de notif au moment exact n'ont probablement **jamais** tourné
automatiquement depuis la mise en place du cron. **À corriger** : comparer/régénérer le
token des deux côtés (GitHub secret `RSS_SYNC_TOKEN` du repo `axelSomian/ATC` ↔ variable
d'env Render de l'API).

---

## 🏛️ Socle fédération (2026-11-08 → 11-12) ✅ — commit `3129bbc` sur `master`

### Livré

| Domaine | Ce qui existe | Notes |
|---|---|---|
| **Licence FIT 2026** | Grille officielle (6 catégories, tarif par âge), catégorie calculée par le système, paiement **simulé**, upload CNI + photo, document avec n° de licence + QR de vérification publique (`/licence/verifier/:code`) | Validité **1 an glissant** depuis le paiement (découverte : 3 mois) ; pas d'âge minimum. ⚠️ URLs Cloudinary CNI/photo non signées — à sécuriser avant usage réel |
| **Tournois** | CRUD admin, statuts (à venir / ouvert / clos / terminé), date limite, capacité max | Statuts changés **à la main** par l'admin |
| **Éligibilité** | Genre, niveau min/max, capacité, **types de licence autorisés** (cumulables, licence active requise) | Contrôlée côté serveur ; testée (38/38 cas) |
| **Inscriptions** | Joueur via l'app ; admin peut inscrire un membre ou un joueur **sans compte** (compte fantôme `isGuest`) | Les ajouts admin ne passent pas par les règles d'éligibilité (sauf capacité) |
| **Tableau** | Élimination directe : tirage au sort (byes répartis), **échange manuel** de joueurs au 1er tour, saisie score/vainqueur avec avancée auto, correction en cascade | |
| **Publication** | Le tableau n'est visible des joueurs qu'après « Publier » ; un nouveau tirage repasse en brouillon | |
| **Côté joueur** | Liste `/tournois` + **fiche dédiée `/tournois/:id`** : places / inscrits / restantes, participants avec photos, classement final, tableau en grille avec traits de liaison | |
| **Notifications** | Push à tous les abonnés à la création d'un tournoi | |
| **Admin** | Refonte complète : navigation groupée avec icônes, vue d'ensemble avec graphiques (activité, niveaux, tournois, licences), fiches détail, tournois en page complète | |

### Données de test présentes dans la base Neon de dev

- Tournoi **« Azael »** : 32/32 inscrits fictifs (`@joueur.tenci.local`), tous avec
  licence Adulte active, tournoi réservé licence Adulte, statut « À venir ».
- Compte joueur de test : `joueur.test@tenci.local` / `Joueur123!` (niveau 3, sans licence).
- ⚠️ **À vérifier** : si la base de dev est la même que la prod, ces données sont en prod.

### ✅ Classement façon ATP — voir § « 🏆 Classement façon ATP » ci-dessous

### 📋 Backlog tournois (après le classement)

| Tâche | Notes |
|---|---|
| Notifications joueurs | Tableau publié (« tu affrontes X »), résultat, élimination |
| Statuts automatiques | Ouverture/clôture des inscriptions selon les dates |
| ~~Têtes de série~~ | ✅ fait le 14/11 (voir § 🏆) |
| Horaire et terrain par match | Planning du tournoi |
| Liste d'attente | Quand le tournoi est complet |
| Design du tableau côté admin | Reprendre la grille avec traits de liaison de la fiche publique |

---

## 🏆 Classement façon ATP (2026-11-14) — branche `feat/classement-atp`

Décisions PO du 14/11 (brainstorm « un N1 qui gagne plein de tournois ne doit pas passer
devant un N5 ») → **option B « qui a le mieux performé »**, modèle ATP simplifié.

### Règles (source de vérité : `apps/api/src/modules/tournaments/ranking.rules.ts`)

| Règle | Valeur |
|---|---|
| Points d'un résultat | barème du tour × base du niveau × coef de catégorie (min 1 pt) |
| Base par niveau (vainqueur d'un Club) | N1 60 · N2 120 · N3 250 · N4 500 · N5 1000 |
| Catégories (coef · inscrits min au tirage) | Club ×1 · 4 — Challenger ×1,5 · 8 — Open ×2 · 16 — Grand Chelem ×3 · 32 |
| Barème du tour | vainqueur 100 % · finaliste 60 % · demi 36 % · puis /2 par tour plus tôt |
| Classement | **6 meilleurs résultats des 12 derniers mois**, calculé à la lecture (pas de cron) |
| Niveau du tournoi | un seul champ (`maxLevel`) : ouvert à ce niveau **et en dessous** (surclassement OK, jamais en dessous). null = open, compté N5. `minLevel` supprimé |
| Montée | **2 tournois gagnés** à son niveau ou au-dessus (12 mois) → +1 ; **1 tournoi gagné à un niveau supérieur** → directement ce niveau. Automatique + notif `level_up`, **annulable par l'admin**. Une victoire déjà utilisée pour une montée (même annulée) ne recompte pas |
| Descente | uniquement par l'admin (onglet Membres) |
| Niveau choisi par le joueur | libre **tant qu'il n'est entré dans aucun tournoi** (cas Google arrivé en N1) ; ensuite verrouillé (API 403 + UI) |

### Ce qui a été fait

- **Migration** `20261114114937_tournament_ranking_atp` : `Tournament.category` (défaut
  `club`), suppression de `minLevel` (vérifié : NULL partout en prod), `TournamentResult`
  + `roundReached`/`level`/`category`/`source`/`earnedAt` (reprise : `earnedAt` = fin du
  tournoi), nouvelle table `LevelChange` (historique des niveaux).
- **API** : `ranking.rules.ts` (pur, 15 tests) + `ranking.service.ts` —
  `syncTournamentResults` appelé à chaque score saisi / corrigé, au retirage et à la
  modif niveau/catégorie/date (idempotent ; finale défaite → points auto retirés, statut
  repasse « clos »). Saisie manuelle des points refusée (409) si le tournoi a un tableau.
  `lib/ranking.ts` : `getStandings` (ex æquo = même rang), `getUserPointsBreakdown`.
  Routes : `GET /members/:id/points`, `PATCH /admin/members/:id/level`,
  `GET /admin/level-changes`, `POST /admin/level-changes/:id/revert`. `GET /members/me`
  renvoie `levelEditable`. Fiche tournoi : `categoryLabel`, `rankingLevel`, `pointsAtStake`.
- **Front** : admin tournoi (section « Classement » : catégorie + niveau + aperçu des
  points ; points en lecture seule quand il y a un tableau) ; nouvel onglet admin
  « Montées de niveau » (historique + Annuler) ; sélecteur de niveau dans Membres ;
  fiche tournoi joueur (tag catégorie + tableau « Points en jeu ») ; Classement
  (« Détail de mes points » : comptés / hors top 6 / expirés) ; profil (niveau verrouillé
  + explication) ; libellés notifs `level_up` / `level_changed`.
- **Vérifié** sur une base Postgres locale (Docker `tenci-dev-db`, port 5433) :
  scénario complet (min inscrits, 1 → 2 victoires, jouer en dessous refusé, correction de
  finale, changement de catégorie, saut N1→N3, annulation, expiration, top 6). Build front
  dev + prod OK, `tsc` API OK, 145 tests Jest OK.

### Têtes de série au tirage (ajouté le 14/11)

- `apps/api/src/modules/tournaments/draw.rules.ts` (pur, 7 tests) : 1 tête de série pour
  4 places (tableau de 8 → 2, 16 → 4, 32 → 8), ordonnées par **points au classement puis
  niveau** (invités / non classés = 0 pt, départagés par le niveau, puis hasard).
  Placement standard (TS1 en haut, TS2 en bas — ne se croisent qu'en finale). **Les byes
  vont aux mieux classés.** Le reste du tableau est tiré au hasard.
- Migration `20261114122053_tournament_seeds` : `TournamentRegistration.seed`. Le tableau
  (`GET …/bracket`) renvoie `seeds` ; affichage « TS n » côté joueur et admin.

### ⚠️ Avant de merger

- **La base de `apps/api/.env` (`ep-wild-frost-…`) EST la prod** (vérifié le 14/11 :
  comptages par club identiques à l'API de prod, 51 vrais comptes). Ne jamais lancer
  `prisma migrate dev` avec ce `.env`. Pour développer :
  `DATABASE_URL=postgresql://atc:atc_secret@localhost:5433/tenci_dev DIRECT_URL=<idem>`.
- La migration partira en prod au merge sur `master` (Render → `prisma migrate deploy`).
- Points saisis à la main avant le 14/11 : conservés (`source = manual`), comptent dans le
  top 6 et expirent 12 mois après la fin de leur tournoi.
- Le meilleur classement atteint (`bestRanking`) n'est recalculé qu'en fin de tournoi
  (l'expiration fait bouger le classement sans événement — accepté).
- Noms de catégories provisoires (« Grand Chelem » = marque ATP/ITF) — à remplacer par la
  terminologie FIT si elle existe (libellés dans `ranking.rules.ts` + `ranking.model.ts`).

## Pour reprendre le travail (état au 2026-11-12)

1. **Branche active : `feat/classement-atp`** — classement ATP codé (voir § 🏆), à
   commiter, relire puis merger. (Ci-dessous : état au 12/11, encore valable.)
   `master` est à jour sur GitHub ; le push du 12/11 a déclenché le déploiement
   automatique (Render + `prisma migrate deploy`) — vérifier qu'il s'est bien passé.
2. **Avant toute migration sur la branche** : confirmer si la base Neon locale
   (`ep-wild-frost-…`, voir `apps/api/.env`) est celle de la prod. Si oui, une
   migration lancée depuis la branche toucherait la prod avant le merge — prévoir une
   base/branche Neon séparée.
3. ~~**Classement ATP**~~ ✅ codé le 14/11 (voir § 🏆).
4. **Toujours ouverts depuis le 2026-11-05** :
   - Bug cron RSS/actualité (`RSS_SYNC_TOKEN` désaligné GitHub ↔ Render).
   - E2E Playwright : specs pas encore écrites dans `Template-PW-automation`.
   - `NOTE_VERSION_BADGES.md`, `presentation-atc.html`, `send-badge-notif.ts` ont été
     committés avec le reste le 12/11 — à supprimer du repo si ce n'étaient que des
     brouillons.
