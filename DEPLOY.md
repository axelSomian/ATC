# Déploiement ATC (gratuit)

Architecture :

| Brique      | Service | Notes |
|-------------|---------|-------|
| PostgreSQL  | **Neon** (free) | 0,5 Go, autosuspend ~5 min |
| API Express + Socket.IO | **Render** Web Service (free) | s'endort après 15 min d'inactivité (cold start ~1 min) |
| Front Angular (statique) | **Vercel** (free) | proxy `/api/*` -> Render via `vercel.json` |

Le front appelle l'API en **relatif** (`/api/v1`). Vercel réécrit `/api/*` vers Render :
pour le navigateur c'est du **same-origin**, donc le cookie `refreshToken` (HttpOnly) reste first-party.
Socket.IO, lui, se connecte **directement** à l'URL Render (auth par token, pas de cookie).

---

## 1. Base de données — Neon

1. Créer un compte sur https://neon.tech → **New Project** (région EU, ex. Frankfurt).
2. Dans **Connection Details**, récupérer 2 chaînes :
   - **Pooled** (bouton "Pooled connection") — contient `-pooler` et `&pgbouncer=true` → ce sera `DATABASE_URL`
   - **Direct** (décocher "Pooled connection") — sans `-pooler` → ce sera `DIRECT_URL`
   - Les deux doivent finir par `?sslmode=require` (ajouter `&pgbouncer=true` sur la pooled).
3. Appliquer les migrations depuis ta machine :
   ```bash
   cd apps/api
   DATABASE_URL="<pooled>" DIRECT_URL="<direct>" pnpm exec prisma migrate deploy
   # (optionnel) données de démo :
   DATABASE_URL="<pooled>" DIRECT_URL="<direct>" pnpm exec tsx prisma/seed.ts
   ```

## 2. API — Render

1. Compte sur https://render.com → **New** → **Blueprint** → connecter le repo GitHub.
   Render détecte `render.yaml` et crée le service `atc-api`.
2. Renseigner les variables `sync: false` (onglet **Environment**) :
   - `DATABASE_URL`   = chaîne Neon **pooled**
   - `DIRECT_URL`     = chaîne Neon **directe**
   - `CORS_ORIGIN`    = (provisoire) `https://atc.vercel.app` — à corriger à l'étape 4
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `MAILEROO_API_KEY`, `MAIL_FROM_ADDRESS`
   - (`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` sont générés automatiquement)
3. Déployer. Noter l'URL finale, ex. `https://atc-api.onrender.com`.
4. Vérifier : `https://atc-api.onrender.com/health` renvoie `{"status":"ok"}`.

## 3. Front — Vercel

1. Éditer **`vercel.json`** : remplacer `REMPLACER-PAR-URL-RENDER.onrender.com` par le host Render réel.
2. Éditer **`apps/web/src/environments/environment.prod.ts`** : mettre l'URL Render complète dans `socketUrl`.
3. Commit + push.
4. https://vercel.com → **Add New Project** → importer le repo.
   - Root Directory : **laisser la racine du repo** (ne pas mettre `apps/web`).
   - Framework Preset : **Other**.
   - Build/Install/Output : déjà définis par `vercel.json`, ne rien changer.
5. Déployer. Noter l'URL, ex. `https://atc.vercel.app`.

## 4. Recoller les URLs

1. Render → `CORS_ORIGIN` = l'URL Vercel exacte (sans `/` final) → redeploy.
2. Tester le flux complet : signup → login → refresh (F5) → notifications temps réel.

---

## Ce que je (Claude) ai déjà fait dans le repo

- `render.yaml` + `vercel.json` créés
- `apps/api/prisma/schema.prisma` : ajout `directUrl` (Neon pooler + migrations)
- `apps/api/tsconfig.json` : `declaration: false` (le build `tsc` était cassé — TS2742)
- `apps/web/angular.json` : `fileReplacements` prod + budgets CSS relevés (le build prod était cassé)
- `apps/web/src/environments/environment{,.prod}.ts` créés ; `socket.service.ts` utilise `environment.socketUrl`
- `apps/api/src/modules/auth/auth.routes.ts` : cookie `sameSite: 'lax'` en prod
- `package.json` racine : `packageManager` + `engines.node`
- `.gitignore` : ne ré-ignore plus `apps/api/prisma/migrations/`
- `.env.example` mis à jour (DIRECT_URL, Maileroo)

## Limites du gratuit

- **Render free dort** : la 1re requête après 15 min d'inactivité prend ~1 min, et les
  WebSockets sont coupées pendant la veille. OK pour un MVP, pas pour de la prod sérieuse.
  Alternative sans veille : **Koyeb** (free) — même `buildCommand` / `startCommand`.
- **Neon free** : 0,5 Go, 1 projet. Largement suffisant au début.
- Uploads : passent déjà par **Cloudinary** (le disque Render est éphémère).
