# ATC — Abidjan Tennis Community

Application web responsive permettant aux membres de la communauté de se connecter, consulter le profil et le niveau des autres membres, publier leurs disponibilités et organiser des matchs de tennis.

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
- **Redis** pour cache + sessions

### Services externes
- **Cloudinary** — upload avatars
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
│   │   │   │   │   ├── availability/
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
│       │   │   ├── availability/
│       │   │   └── notifications/
│       │   ├── middleware/
│       │   ├── lib/             # prisma, redis, mailer, sms
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

Palette **ATC — premium tennis lifestyle** (validée client, sept. 2026). Tokens
centralisés dans `apps/web/src/styles.css` (`:root`). Ne pas introduire de couleur
hors palette sans raison UX forte.

- **Signature** : ATC Green `#1F5A45` (`--color-accent`) — boutons primaires, CTA,
  états actifs, onglets sélectionnés, éléments de marque. Utilisée stratégiquement,
  jamais en aplat partout.
- **Contraste sombre** : Deep Forest `#163F32` (`--color-deep-forest`) — sidebar,
  topbar/bottom-nav mobile, panneaux sombres, héros. Sur fond sombre, les accents
  passent en **Sage `#8FAE9B`** (l'ATC Green n'y est pas lisible).
- **Bases claires** (dominantes) : Soft White `#F8F6F1` (`--color-surface`, cartes),
  canvas légèrement plus chaud `--color-bg` `#F1EBDF`, Warm Ivory `#EDE5D8`
  (`--color-cream` — surfaces secondaires, inputs, empty states).
- **Accents lifestyle secondaires** : Sand Beige `#CDBDA7` (`--color-sand-beige`),
  Sage `#8FAE9B` (`--color-sage`). Discrets, ne concurrencent jamais l'ATC Green.
- **Typo / contraste** : Soft Black `#1C1C1A` (`--color-ink`) pour le texte ; jamais
  de `#000` ni de `#fff` en surface.
- **Sémantique** (uniquement quand nécessaire, compatible palette) :
  `--color-positive` `#2F6B4F` (victoires, scores confirmés),
  `--color-error` `#B23B2E`, `--color-warning` `#B07D3C`.
- **Fontes** : Inter (corps + titres), Plus Jakarta Sans (logo).
- **Photos** : `apps/web/src/assets/img/*.webp` — photographie tennis lifestyle
  pour casser le côté « appli bancaire ». `court-serve` (voile Deep Forest) = héros
  login ; `court-editorial` = héros signup ; `court-detail` = vignette du hero dashboard.
  **Placeholders Unsplash à remplacer par de vraies photos ATC** (même noms de fichiers).
- **Système de niveau** : 5 dots — N1 Débutant·e → N2 Initié·e → N3 Intermédiaire → N4 Avancé·e → N5 Compétition. Libellés + descriptions (profil / jeu) stockés en base (table `Level`, éditables par un admin) et exposés via `GET /api/v1/levels`. Les bornes de rating ELO restent dans `apps/api/src/modules/matches/elo.ts`.
- **Layout** : sidebar fixe sur desktop, bottom nav sur mobile, breakpoint ~768px
- **Ton** : premium, féminin, contemporain, épuré — jamais « appli sport générique ».

---

## 📊 Modèle de données (Prisma)

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  phone           String?  @unique
  passwordHash    String
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

  availabilities  Availability[]
  matchesAsHost   Match[]      @relation("host")
  matchesAsGuest  Match[]      @relation("guest")
  dispos          DispoPost[]
}

model Availability {
  id        String   @id @default(cuid())
  userId    String
  startsAt  DateTime
  endsAt    DateTime
  status    String   // 'free' | 'busy' | 'matched'
  user      User     @relation(fields: [userId], references: [id])
}

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

### Auth
- `POST /auth/signup` — créer un compte
- `POST /auth/login` — email + mot de passe → JWT
- `POST /auth/refresh` — refresh token
- `POST /auth/logout`
- `GET  /auth/me`

### Membres
- `GET  /members` — liste paginée (filtres: `level`, `online`, `city`, `q`)
- `GET  /members/:id` — profil détaillé
- `PATCH /members/me` — update profil
- `POST /members/me/avatar` — upload avatar

### Disponibilités
- `GET    /availability/me?week=YYYY-MM-DD`
- `PUT    /availability/me/slot` — `{ startsAt, endsAt, status }`
- `DELETE /availability/me/slot/:id`

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
- **Rate limiting** : `express-rate-limit` (login: 5/min, signup: 3/h)
- **Helmet** pour headers sécurisés
- **CORS** : whitelist explicite (front domain uniquement)
- **Validation Zod** sur TOUS les payloads entrants
- Sanitization HTML pour les champs bio/notes
- HTTPS obligatoire en prod (Let's Encrypt)

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

### Phase 1 — Foundations
- [ ] Setup monorepo, Docker, CI
- [ ] Schéma Prisma + migrations
- [ ] Auth complète (signup, login, refresh)
- [ ] Layout responsive (sidebar/bottom nav)

### Phase 2 — Core features
- [ ] CRUD membres + profil
- [ ] Annuaire avec recherche/filtres
- [ ] Calendrier de disponibilités
- [ ] Publication de dispo + demandes
- [ ] Historique des matchs

### Phase 3 — Communauté
- [ ] Notifications temps réel
- [ ] Messagerie 1-to-1
- [ ] Carte des courts/joueurs
- [ ] Page asso (news, événements)

### Phase 4 — Plus
- [ ] Tournois & classements
- [ ] Réservation de courts
- [ ] App mobile (Ionic/Capacitor)
- [ ] Paiement cotisations / inscriptions

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
