# ATC — Abidjan Tennis Community

ATC est une communauté de tennis visant à mettre en relation les passionnés de ce sport. Application web responsive permettant aux membres de se connecter, consulter le profil et le niveau des autres membres, publier des annonces et organiser des matchs de tennis.

---

## 🔄 Pivot en cours — ATC devient TenCI (annoncé 05/11/2026)

Le PO a décidé de **vendre ATC à une fédération de tennis**. Conséquences actées à date,
**lire avant tout nouveau dev** :

- **Renommage ATC → TenCI**, portée large déjà confirmée par le PO : marque/UI **+**
  domaine/repo **+** code & DB (identifiants internes, schéma Prisma, slugs...). Pas un
  simple rebrand cosmétique — le nom « ATC » / « atc » apparaît dans le code, les routes
  Cloudinary (`atc/avatars`, `atc/clubs`), les URLs Render/Vercel, les e-mails, le
  manifest PWA, etc. **Inventorier tous les points avant de renommer** (grep global
  `ATC`/`atc` dans `apps/`, `*.yml`, `render.yaml`, `.env*`, noms de domaine).
- **Modèle produit** : ce n'est pas une marque blanche — TenCI devient la **plateforme
  officielle d'une fédération**. Prévoir à terme : classements officiels, validation
  fédérale des clubs/membres, rôles au-delà de `admin`/`member` actuels (voir § Espace
  admin dans `SUIVI.md`). Impact structurel probable sur le schéma Prisma, pas seulement
  visuel.
- **Liste précise des demandes de la fédération** : pas encore communiquée au PO au
  moment de la rédaction — **ne pas lancer de dev de fonctionnalités fédérales sans
  cette liste**. Le rebrand visuel (ci-dessous), lui, est déjà lancé car demandé
  explicitement par le PO indépendamment de cette liste.
- **Calendrier** : pas encore précisé.

### Direction visuelle TenCI — ✅ APPLIQUÉE au code (05/11/2026, commit `ae82ac7`)

Le PO voulait « un design plus app », moins le mood éditorial/lifestyle chaleureux
d'ATC. Direction validée et déjà reportée dans `apps/web/src/styles.css` (tokens
`:root`) — voir § Design system ci-dessous pour le détail à jour, **ne plus se fier
à la description de l'ancienne palette ATC Green dans ce fichier avant ce commit**.

- **Palette** : `--navy #10243D` (sidebar/topbar/texte fort) · `--volt #D9EC3C`
  (accent unique — CTA, états actifs, logo ; « la balle ») · `--cloud #F4F5F1`
  (surface claire, blanc cassé froid) · `--clay #C1440E` (accent secondaire ponctuel —
  badges, mise en avant) · `--mist #DDE3DF` (bordures) · `--win #1E9E64` (sémantique
  victoire uniquement).
- **Typo** : **Space Grotesk** (700/800) pour titres, logo, et les gros chiffres
  (scores, stats). **Manrope** (400–700) pour le texte courant.
- **Principe** : sidebar/topbar en navy foncé (registre « tableau de bord officiel »),
  CTA primaire = volt plein + texte navy, une seule carte « héro » élevée par écran
  (éviter l'effet kit de cartes SaaS identiques), le volt reste le seul accent vif.
- **Reste à migrer** (trouvé en audit du 05/11, pas encore corrigé partout) :
  `apps/web/src/index.html` (`theme-color`/`mask-icon` encore sur l'ancien vert
  `#1F5A45`), `apps/web/src/manifest.webmanifest` (`theme_color`/`background_color`
  idem — le `name`/`short_name` "ATC" du manifest, lui, **reste tel quel** tant que le
  renommage produit n'est pas scopé), le dégradé du ruban SVG des badges
  (`badge-crest.component.ts`, encore vert forêt ATC). `match-card.service.ts`
  (police des images de score partageables) corrigé.
- Le nom littéral "TenCI" n'a encore été écrit nulle part dans le code (logo, titre,
  manifest) — seul le rebrand visuel (couleurs/typo) a été appliqué pour l'instant.

---

## 📐 Stack technique

### Monorepo
- **pnpm workspaces** (ou **Nx**) — `apps/web`, `apps/api`, `libs/shared` (types TypeScript partagés)
- **TypeScript strict** partout

### Frontend — `apps/web`
- **Angular 17+** standalone components, signals
- **Angular Router** + lazy loading par feature
- **TailwindCSS** pour le styling utilitaire
- **Angular Material** pour composants complexes (datepicker, dialog)
- **RxJS** + **Signals** pour la réactivité
- **NgRx Signal Store** pour l'état global (auth, membres, dispos)
- **date-fns** pour les dates, avec locale `fr`

### Backend — `apps/api`
- **Node.js 20+** + **Express.js** + **TypeScript**
- **Prisma** ORM
- **Passport.js** + JWT (access + refresh) pour l'auth
- **bcrypt** pour les mots de passe
- **Zod** pour validation des payloads
- **Socket.IO** pour le temps réel (notifications, messagerie)

### Base de données
- **PostgreSQL 16** (entités relationnelles)
- ~~Redis~~ — envisagé pour cache/sessions, **non utilisé** (retiré du projet)

### Services externes
- **Cloudinary** — upload avatars (`atc/avatars`) + photos de clubs (`atc/clubs`) ; helper `lib/cloudinary.ts` `uploadImage()`
- **SendGrid** — emails transactionnels
- **Twilio** ou **Orange CI SMS API** — SMS (vérification, rappels)
- **Mapbox** — carte des courts et joueurs

### Qualité & DevOps
- **ESLint** + **Prettier** + **Husky** (pre-commit lint)
- **Jest** + **Supertest** côté back, **Vitest** côté front
- **Playwright** pour les tests E2E
- **Docker** + **docker-compose** en dev
- **GitHub Actions** pour CI/CD
- **Sentry** pour monitoring

---

## 🗂️ Structure du projet

```
atc/
├── apps/
│   ├── web/                    # Angular
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/        # services singleton, guards, interceptors
│   │   │   │   ├── shared/      # composants/pipes/directives réutilisables
│   │   │   │   ├── features/
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── members/
│   │   │   │   │   ├── profile/
│   │   │   │   │   ├── match-finder/
│   │   │   │   │   └── history/
│   │   │   │   ├── layout/      # sidebar, topbar, mobile-nav
│   │   │   │   └── app.config.ts
│   │   │   └── styles.css
│   │   └── tailwind.config.js
│   └── api/                    # Express
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── members/
│       │   │   ├── matches/
│       │   │   └── notifications/
│       │   ├── middleware/
│       │   ├── lib/             # prisma, mailer, cloudinary, socket, phone
│       │   └── server.ts
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
├── libs/
│   └── shared/                 # DTO, enums, types
└── docker-compose.yml
```

---

## 🎨 Design system

Palette **TenCI — plateforme officielle** (rebrand appliqué 05/11/2026, commit
`ae82ac7` — remplace l'ancienne palette « ATC premium tennis lifestyle »). Tokens
centralisés dans `apps/web/src/styles.css` (`:root`). Ne pas introduire de couleur
hors palette sans raison UX forte.

- **Signature** : Volt `#D9EC3C` (`--color-accent`) — boutons primaires, CTA, états
  actifs, onglets sélectionnés, éléments de marque (texte en Navy dessus, pas blanc —
  le Volt est trop clair). Utilisée stratégiquement, jamais en aplat partout.
- **Contraste sombre** : Navy `#10243D` (`--color-deep-forest`/`--color-ink`) —
  sidebar, topbar/bottom-nav mobile, panneaux sombres, héros, texte fort. Registre
  « tableau de bord officiel » plutôt que lifestyle chaleureux.
- **Bases claires** (dominantes) : Cloud `#F4F5F1` (`--color-surface`, cartes),
  canvas `--color-bg` `#ECEEF0`, gris froid `#E8ECEB` (`--color-cream` — surfaces
  secondaires, inputs, empty states).
- **Accents secondaires** : Clay `#C1440E` (badges, mise en avant ponctuelle,
  `--color-error`), Mist `#DDE3DF` (bordures). Discrets, ne concurrencent jamais le Volt.
- **Typo / contraste** : texte en Navy `#10243D` (`--color-ink`) ; jamais de `#000`
  ni de `#fff` en surface.
- **Sémantique** (uniquement quand nécessaire, compatible palette) :
  `--color-positive`/`--color-success` Win `#1E9E64` (victoires, scores confirmés),
  `--color-error` Clay `#C1440E`, `--color-warning` `#B07D3C` (inchangé, hors palette
  de marque — à revoir si besoin).
- **Fontes** : Manrope (corps + texte courant), Space Grotesk (titres, logo, gros
  chiffres — scores, stats).
- **Photos** : `apps/web/src/assets/img/*.webp` — `court-serve` = héros login ;
  `court-editorial` = héros signup (photo aérienne de volée) ; `w/w-*.webp` = les 6
  tuiles de l'accueil (annonce, membres, clubs, classement, matchs, profil), voile
  dégradé pesé vers le bas. **Toutes générées / d'illustration → à remplacer par de
  vraies photos ATC** (mêmes noms de fichiers, aucun code). Sinon pas de photo dans
  l'app connectée : ambiance = filigrane « blueprint » (lignes de court, `stroke-opacity`
  ~0.07) sur `.layout-content`, + hero Deep Forest + demi-court SVG sur la page match.
- **Structure** : `/accueil` = page d'accueil = grille de widgets illustrés (lanceur vers
  Créer une annonce / Membres / Clubs / Classement / Mes matchs / Profil). `/profile` =
  dashboard + profil fusionnés (infos + stats du joueur connecté). Pas de route `/dashboard`.
  `/clubs` = annuaire des clubs = **grille de cartes visuelles** (photo, nom, localisation,
  nb membres ATC, cœur favori) → chaque carte renvoie vers la **fiche club `/clubs/:slug`**
  (`ClubDetailComponent` : hero photo, présentation, adresse, honoraires, contact/site,
  aperçu des 12 premiers membres + lien « voir tous » vers `/members?club=<slug>`).
  Favoris = localStorage (par appareil, `ClubFavoritesService`), favoris en tête. La photo
  est la seule exception à « pas de photo dans l'app connectée » (contenu d'identité, comme
  les avatars) ; placeholder = dégradé ATC + monogramme si `imageUrl` est null.
- **Système de niveau** : 5 dots — N1 Débutant → N2 Intermédiaire → N3 Avancé → N4 Compétiteur → N5 Professionnel (reclassé aoû. 2026, retour PO : séparer l'amateur-compétiteur du pro ; migration `20260829160000_levels_reclassification`). **Pas d'emoji** (les 5 dots restent la représentation). Libellés + descriptions (profil / jeu) stockés en base (table `Level`, éditables par un admin) et exposés via `GET /api/v1/levels`. Les bornes de rating ELO restent dans `apps/api/src/modules/matches/elo.ts` — N5 est atteignable par l'ELO (rating ≥ 1500), ce n'est pas un statut. Le niveau ne bouge qu'après 5 matchs confirmés (`applyEloUpdate` ne touche pas `level` avant).
- **Layout** : sidebar fixe sur desktop, bottom nav sur mobile, breakpoint ~768px
- **Ton** : premium, féminin, contemporain, épuré — jamais « appli sport générique ».

---

## 📊 Modèle de données (Prisma)

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  phone           String?  @unique
  passwordHash    String?  // null si compte créé via Google
  googleId        String?  @unique
  name            String
  initials        String
  avatarUrl       String?
  level           Int      // 1..5
  age             Int?
  bio             String?
  city            String?
  clubId          String?  // FK -> Club (table éditable par admin, GET /api/v1/clubs)
  racquet         String?
  preferredCourts String[]
  preferredTimes  String[]
  joinedAt        DateTime @default(now())
  online          Boolean  @default(false)

  matchesAsHost   Match[]      @relation("host")
  matchesAsGuest  Match[]      @relation("guest")
  dispos          DispoPost[]
}

// NB : plus de table Court (fusionnée dans Club, aoû. 2026 — migration
// 20260829190000_merge_court_into_club). Le **Club est l'unique entité « lieu »** :
// appartenance des membres, annuaire, ET lieu de jeu. `court` reste stocké en
// texte sur Match/DispoPost/QuickMatch ; on rapproche par `Club.name` (+ `Club.lat`/`lng`)
// pour la carte (OpenStreetMap) et l'itinéraire.

model DispoPost {
  id        String   @id @default(cuid())
  userId    String
  when      DateTime
  duration  Int      // minutes
  court     String
  type      String   // 'simple' | 'double' | 'mixte'
  note      String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  requests  MatchRequest[]
}

model MatchRequest {
  id          String   @id @default(cuid())
  dispoPostId String
  requesterId String
  status      String   // 'pending' | 'accepted' | 'declined'
  dispoPost   DispoPost @relation(fields: [dispoPostId], references: [id])
}

model Match {
  id        String   @id @default(cuid())
  hostId    String
  guestId   String
  playedAt  DateTime
  court     String
  type      String
  scoreHost String   // ex: "6-4 7-5"
  scoreGuest String
  winnerId  String
  host      User     @relation("host",  fields: [hostId],  references: [id])
  guest     User     @relation("guest", fields: [guestId], references: [id])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // 'match_request' | 'match_confirmed' | 'news' ...
  payload   Json
  readAt    DateTime?
  createdAt DateTime @default(now())
}
```

---

## 🔌 API REST principale

Base : `/api/v1`

### Référence (public, sans auth)
- `GET /clubs` — clubs actifs + `memberCount` + `imageUrl` + `lat`/`lng` (sélecteurs profil/annonce, page `/clubs`, carte des matchs). Le club **est** le lieu de jeu.
- `GET /clubs/:slug` — fiche d'un club actif (`address`, `description`, `feesInfo`, `phone`, `website`, `imageUrl`, `lat`/`lng`, `memberCount`) ; 404 si inconnu/inactif
- `GET /levels` — libellés des 5 niveaux

### Auth
- `POST /auth/signup` — créer un compte
- `POST /auth/login` — email + mot de passe → JWT
- `POST /auth/google` — `{ credential }` (ID token Google Identity Services) → JWT ; crée
  ou relie le compte (par `googleId`, sinon par email). Réponse `{ user, accessToken, isNew }`.
  Nécessite `GOOGLE_CLIENT_ID` (API) + `googleClientId` (front, `environment*.ts`) —
  sans ça le bouton « Continuer avec Google » est masqué.
- `POST /auth/refresh` — refresh token
- `POST /auth/logout`
- `GET  /auth/me`

### Membres
- `GET  /members` — liste paginée (filtres: `level`, `online`, `city`, `club` (slug), `q`)
- `GET  /members/:id` — profil détaillé
- `PATCH /members/me` — update profil
- `POST /members/me/avatar` — upload avatar

### Annonces de match (DispoPost)
- `GET  /dispos` — feed (filtres: `date`, `level`, `type`, `court`)
- `POST /dispos` — publier une dispo
- `POST /dispos/:id/request` — demander à participer
- `POST /dispos/:id/requests/:reqId/accept`
- `DELETE /dispos/:id`

### Matchs
- `GET  /matches/me` — historique
- `POST /matches` — enregistrer un match terminé
- `GET  /matches/:id`

### Notifications
- `GET   /notifications`
- `PATCH /notifications/:id/read`

### Admin (`role = 'admin'` requis — `authenticate` + `requireAdmin`)
- `GET/POST /admin/clubs`, `PATCH/DELETE /admin/clubs/:id` — CRUD clubs
- `POST /admin/clubs/:id/image` — upload photo du club (multipart `image`, → Cloudinary `atc/clubs`, recadré 800×500, écrit `Club.imageUrl`)
- (plus d'onglet « Terrains » : fusionné dans « Clubs » — `Club` porte `address` + `lat`/`lng`, position posée sur carte Leaflet)
- `GET /admin/levels`, `PATCH /admin/levels/:level` — édition libellés de niveau
- `GET /admin/matches/disputed`, `POST /admin/matches/:id/resolve` — résolution des litiges de score
- `GET /admin/members`, `PATCH /admin/members/:id/role` — gestion des rôles

### Temps réel (Socket.IO)
- `member:online` / `member:offline`
- `dispo:new` — nouvelle annonce dans le feed
- `match:request` — quelqu'un veut votre dispo
- `notification:new`

---

## 🔐 Sécurité

- **JWT** access (15 min) + refresh (7 jours, stocké HttpOnly cookie)
- **bcrypt** rounds 12 minimum
- **Rate limiting** : `express-rate-limit` (login + google: 5/min, signup: 3/h)
- **Google** : l'ID token est vérifié côté serveur (`google-auth-library`, audience = `GOOGLE_CLIENT_ID`) ;
  compte relié seulement si `email_verified`
- **Helmet** pour headers sécurisés
- **CORS** : whitelist explicite (front domain uniquement)
- **Validation Zod** sur TOUS les payloads entrants
- **E-mails** : toute valeur utilisateur (nom, court, note, score) passe par `esc()` dans
  `modules/mailer/templates.ts` avant interpolation HTML — sinon injection de markup chez
  le destinataire. Ne jamais interpoler une valeur brute dans un template.
- Affichage front : auto-échappement Angular ; `[innerHTML]` réservé à des constantes
  (icônes SVG codées en dur), jamais de données utilisateur.
- HTTPS obligatoire en prod (Let's Encrypt)
- Audit sess. 7 : aucun problème critique. Reste (bas) — voir `SUIVI.md` § Audit sécurité :
  bornes de longueur sur `note`/`score`, `email_verified === true` strict, intercepteur
  front à restreindre à `/api/`, aucun parcours « mot de passe oublié ».

---

## 📝 Conventions de code

### Général
- Commits : **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `chore:` ...)
- Branche : `main` (prod), `develop` (intégration), `feat/*`, `fix/*`
- Pull Request obligatoire pour merger sur `develop` ou `main`
- Code review obligatoire (au moins 1 approval)

### Frontend Angular
- **Standalone components** uniquement (pas de NgModule)
- Un composant = un dossier (`my-comp/my-comp.component.ts|html|css|spec.ts`)
- Signals plutôt que BehaviorSubject quand possible
- Lazy loading par feature
- Inputs/Outputs typés strictement
- Tailwind d'abord, CSS local uniquement si nécessaire

### Backend Express
- Une feature = un module (`modules/<name>/{routes,controller,service,schema}.ts`)
- Schemas Zod co-localisés
- Services purs (pas d'accès req/res direct)
- Erreurs via classe `AppError` + middleware central
- Tous les endpoints documentés en OpenAPI

### Tests
- Couverture minimale **70%** sur les services métier
- Tests E2E sur les flows critiques : signup, login, publier dispo, accepter match

---

## 🌍 Internationalisation

- **Langue par défaut : Français**
- Préparer ngx-translate pour ajouter l'anglais plus tard
- Tous les textes via clés i18n, pas en dur
- Format date : `dd MMMM yyyy` (français)
- Devise éventuelle : XOF (Franc CFA)

---

## 🇨🇮 Spécificités Côte d'Ivoire

- Téléphone : préfixe `+225` par défaut, validation 10 chiffres
- Villes principales pré-remplies : Abidjan (Plateau, Cocody, Yopougon, Treichville, Marcory, Koumassi, Abobo, Riviera, II Plateaux), Bouaké, Yamoussoukro, San-Pédro
- SMS via **Orange CI** ou **Twilio** (vérification téléphone, rappels de match)
- Paiement (futur) : **CinetPay** ou **Wave** (mobile money intégré)
- Fuseau horaire : `Africa/Abidjan` (UTC)

---

## 🚀 Roadmap MVP

> ⚠️ Cases mises à jour 05/11/2026 — beaucoup de « Phase 3 » étaient en réalité livrées
> depuis des semaines et jamais cochées ici. Voir `SUIVI.md` pour le détail par sprint.

### Phase 1 — Foundations
- [x] Setup monorepo, Docker, CI (CI E2E partielle seulement — voir `SUIVI.md` § Bugs connus)
- [x] Schéma Prisma + migrations
- [x] Auth complète (signup, login, refresh, vérif e-mail, mot de passe oublié)
- [x] Layout responsive (sidebar/bottom nav)

### Phase 2 — Core features
- [x] CRUD membres + profil
- [x] Annuaire avec recherche/filtres
- [x] Publication de dispo + demandes
- [x] Historique des matchs

### Phase 3 — Communauté
- [x] Notifications temps réel (Socket.IO + Web Push PWA)
- [x] Messagerie 1-to-1 (créée à l'acceptation d'un match, indicateur « en train d'écrire »)
- [x] Carte du lieu d'un match (OpenStreetMap, sans clé API) + itinéraire ; le **Club** est l'entité lieu (fusion `Court`→`Club`, aoû. 2026)
- [ ] Carte des joueurs
- [x] Page asso (news, événements) — EPIC Actualité livré (admin + page + détail + événements + RSS)

### Phase 4 — Plus
- [x] Badges / hauts faits (3 séries + 10 hauts faits, socle + front livrés)
- [x] Carte d'enjeu de match (proba + points en jeu, rating brut jamais exposé) + carte de match partageable (image story, partage natif)
- [ ] Tournois & classements officiels
- [ ] Réservation de courts
- [ ] App mobile (Ionic/Capacitor)
- [ ] Paiement cotisations / inscriptions
- [ ] 🔄 Fonctionnalités demandées par la fédération — liste à venir (voir § Pivot TenCI)

---

## 💡 Notes pour Claude

- Toujours référencer le **prototype** (`ATC.html`) pour les choix UI/UX validés
- Respecter le **design system** (couleurs, typo, niveau 5 dots) — ne pas inventer
- Code **TypeScript strict** : pas de `any`, pas de `@ts-ignore`
- Préfère **standalone components** Angular et **signals** plutôt que BehaviorSubject
- Endpoint = un fichier route + un service + un schema Zod (jamais tout dans le controller)
- Pour tout nouveau composant, vérifie d'abord s'il existe déjà dans `shared/`
- Tests obligatoires pour tout service métier (auth, dispos, matchs)
- Localisation **française** par défaut, pas de hardcoded English strings
