# SPEC — Parcours E2E ATC

> But de ce document : décrire **ce que fait un utilisateur de bout en bout** dans ATC,
> parcours par parcours, pour qu'on puisse automatiser ces scénarios (Playwright) et
> savoir précisément ce qu'on teste. Ce n'est pas une spec technique de l'implémentation :
> c'est la liste des « histoires » utilisateur, avec leurs préconditions, leurs étapes et
> ce qu'on doit pouvoir affirmer à la fin (assertions).
>
> Stack rappel : front Angular 17 (`apps/web`, standalone + signals), API Express + Prisma
> + PostgreSQL (`apps/api`), Socket.IO pour le temps réel, Web Push pour la PWA.
> Langue : **français** partout. Fuseau : `Africa/Abidjan` (UTC).

---

## 0. Prérequis techniques pour lancer les E2E

### 0.1 Environnement

| Élément | Valeur dev | Commande |
|---|---|---|
| Base de données | Postgres local (docker) | `pnpm db:up` (db + redis, redis inutilisé) |
| Migrations | Prisma | `pnpm migrate` |
| Données de démo | 20 joueurs + matchs simulés + clubs | `npx tsx apps/api/prisma/seed.ts` |
| API | `http://localhost:3000` | `pnpm dev:api` |
| Front | `http://localhost:4200` (proxy `/api/v1` → 3000) | `pnpm dev:web` |
| Socket.IO | `http://localhost:3000` (pas proxifié) | — |

Base URL Playwright : `http://localhost:4200`.

### 0.2 Comptes de test

- Le **seed** crée 20 joueurs. Tous ont le **même mot de passe** (vérifier dans
  `apps/api/prisma/seed.ts` — hash bcrypt commun). Emails de la forme
  `prenom.nom@…` (à confirmer dans le seed).
- **Admin** : `guyaxelsomian@gmail.com` (rôle `admin`). En E2E, prévoir un compte admin
  dédié seedé, ou promouvoir un joueur via `PATCH /api/v1/admin/members/:id/role`.
- Pour les parcours d'inscription, chaque test crée **son propre** compte avec un email
  unique (`e2e+<timestamp>@atc.test`).

### 0.3 Points durs à régler AVANT d'automatiser

1. **Emails transactionnels non capturés en dev.** Sans `MAILEROO_API_KEY`, l'API se
   contente de `console.log('[Mailer] 📧 <sujet> → <destinataire>')` — **le lien / le
   token n'est PAS loggé** (`apps/api/src/lib/mailer.ts`). Or les tokens de
   vérification d'e-mail et de reset de mot de passe sont générés en clair puis **hashés
   en SHA-256** avant stockage (`auth.service.ts`) : impossible de les relire depuis la
   DB.
   → **Il faut ajouter un mécanisme de test** : soit un « mail catcher » en mémoire dans
   l'API exposé par une route `GET /api/v1/_test/last-email` (activée uniquement si
   `NODE_ENV=test`), soit un transport mailer qui écrit chaque e-mail (HTML complet) dans
   un fichier / une table. Sans ça, les parcours **Vérification e-mail** et **Mot de passe
   oublié** ne sont pas testables end-to-end.
2. **Isolation des données.** Chaque run E2E doit repartir d'une DB connue :
   `truncate.sql` + re-seed, ou une base dédiée `atc_e2e`. Les parcours qui écrivent
   (annonces, défis, scores, messages, admin) polluent la base.
3. **Socket.IO / temps réel.** Les assertions « la notif arrive en direct » demandent
   soit deux contextes navigateur (deux `browserContext`), soit d'accepter une petite
   attente + reload. À décider par parcours (voir §12).
4. **Web Push.** `vapidPublicKey` est vide en dev → pas d'abonnement push. Les tests push
   réels ne sont pas faisables en local sans clés VAPID + un service worker actif. On
   teste le **fallback in-app** (badge cloche) et l'e-mail.
5. **Google Sign-In.** Le bouton « Continuer avec Google » dépend de `googleClientId`.
   En E2E on **ne teste pas** le flux Google (dépend de Google Identity Services) — on
   vérifie juste la présence/absence conditionnelle du bouton.
6. **Upload Cloudinary** (avatar, photo club). Sans clés Cloudinary l'upload échoue.
   Soit on mocke la route, soit on saute l'assertion « l'image s'affiche ».

---

## 1. Personas

| Persona | Description | Usage E2E |
|---|---|---|
| **Visiteur** | Non connecté | Pages publiques, redirections des guards |
| **Nouveau membre** | Vient de s'inscrire, e-mail non vérifié, CGU acceptées | Onboarding, bandeau de vérification |
| **Membre actif** | Compte vérifié, profil complété, quelques matchs | Cœur de l'app |
| **Adversaire** | Second membre actif | Toutes les interactions à 2 (demande, défi, message, score) |
| **Admin** | `role = 'admin'` | Espace `/admin` |

Beaucoup de parcours sont **à deux joueurs** : prévoir deux sessions authentifiées
(A = initiateur, B = destinataire).

---

## 2. Carte des routes (front)

```
Public (guestGuard — redirige vers /accueil si déjà connecté)
  /                          ← page d'accueil publique (TenCI, 05/11/2026), CTA signup/login
  /auth/login
  /auth/signup
  /auth/forgot-password
Public (accessible connecté ou non — liens e-mail)
  /auth/verify-email?token=…
  /auth/reset-password?token=…
  /legal/confidentialite
  /legal/cgu
Connecté (authGuard + termsGuard)
  /legal/accept              ← si CGU pas à jour, termsGuard force ici
  /accueil                   ← grille de widgets (lanceur)
  /members  /members/:id
  /clubs    /clubs/:slug
  /profile                   ← dashboard + profil fusionnés
  /matchs?vue=trouver|mes-matchs   ← hub : "Trouver un adversaire" + "Mes matchs"
  /actualite  /actualite/evenements  /actualite/:slug
  /messages   /messages/:id
  /notifications
  /rankings
  /admin (adminGuard)
```

Navigation : **sidebar** (desktop ≥768px) / **bottom-nav** (mobile). Bottom-nav = Accueil,
Membres, Matchs, Classement, Profil. Sidebar ajoute Actualité, Clubs, Messages, (Admin).

---

## 3. Parcours AUTH

### 3.0 Découverte — page d'accueil publique

**Objectif** : un visiteur non connecté comprend ce qu'est TenCI et se dirige vers
l'inscription ou la connexion.

**Étapes**
1. Aller sur `/` sans session.

**Assertions**
- La page d'accueil publique s'affiche (pas de redirection directe vers
  `/auth/login`) : mission, parcours en 4 étapes, avantages, section licence,
  bande fédération.
- CTA « Créer mon compte » → `/auth/signup` ; « Se connecter » (topbar et bas de
  page) → `/auth/login`.
- Connecté, aller sur `/` → `guestGuard` redirige vers `/accueil` (même règle que
  pour `/auth/login`).
- Liens de pied de page vers `/legal/confidentialite` et `/legal/cgu` fonctionnels.

### 3.1 Inscription (nouveau membre)

**Objectif** : un visiteur crée un compte et se retrouve connecté dans l'app.

**Préconditions** : email jamais utilisé ; au moins 1 club actif en base (seed).

**Étapes**
1. Aller sur `/auth/signup`.
2. Remplir : Nom complet (2–50 car.), Email valide, Mot de passe (≥ 8 car.),
   choisir un **niveau** (1–5, sélecteur 5 dots), Ville (liste CI), Club (liste).
3. **Cocher** la case « j'accepte les conditions d'utilisation et la politique de
   confidentialité » (obligatoire — `Validators.requiredTrue`).
4. Soumettre.

**Assertions**
- Redirection vers `/accueil` (l'utilisateur est connecté : JWT access en mémoire,
  refresh en cookie HttpOnly).
- Un **bandeau « Vérifiez votre e-mail »** est visible (`verify-banner`).
- `GET /api/v1/auth/me` renvoie le user avec `emailVerified = false` (ou équivalent).
- Un e-mail `verify_email` est parti (visible via le mail-catcher de test).
- Un e-mail `welcome` est parti.

**Pièges**
- Sans la case CGU cochée → bouton désactivé / erreur, pas de compte créé.
- Email déjà pris → message d'erreur, reste sur `/auth/signup`.
- Rate limit signup : **3/heure** par IP — attention si beaucoup de tests d'inscription.

### 3.2 Vérification de l'e-mail

**Objectif** : le nouveau membre valide son adresse via le lien reçu.

**Préconditions** : parcours 3.1 fait ; token récupéré via le mail-catcher.

**Étapes**
1. Ouvrir `/auth/verify-email?token=<raw>` (fonctionne connecté ou non).

**Assertions**
- Message de succès (« adresse vérifiée »).
- Le bandeau de vérification disparaît (après reload / refresh du `me`).
- `POST /api/v1/auth/verify-email` a renvoyé 200 ; 2ᵉ appel avec le même token → erreur
  (token consommé).
- Token invalide / expiré → message d'erreur explicite, pas de crash.

**Variante** : bouton « Renvoyer l'e-mail » (`POST /auth/resend-verification`, nécessite
d'être connecté) → nouvel e-mail, nouveau token.

### 3.3 Connexion (email + mot de passe)

**Objectif** : un membre existant se connecte.

**Étapes**
1. `/auth/login`, saisir email + mot de passe d'un compte seedé, soumettre.

**Assertions**
- Redirection vers `/accueil`.
- Sidebar / bottom-nav visibles ; `GET /auth/me` OK.
- Mauvais mot de passe → message d'erreur, reste sur `/auth/login`, pas de token.
- Rate limit login : **5/min**.

**Variante guestGuard** : being connecté, aller sur `/auth/login` → redirigé vers
`/accueil`.

### 3.4 Mot de passe oublié → réinitialisation

**Objectif** : un membre qui a perdu son mot de passe s'en refait un.

**Étapes**
1. `/auth/login` → lien « Mot de passe oublié » → `/auth/forgot-password`.
2. Saisir l'email, soumettre → `POST /auth/forgot-password`.
3. Message **neutre** (« si un compte existe, un e-mail a été envoyé ») — pas de fuite
   d'existence du compte.
4. Récupérer le token (mail-catcher), ouvrir `/auth/reset-password?token=<raw>`.
5. Saisir un nouveau mot de passe (≥ 8), soumettre → `POST /auth/reset-password`.

**Assertions**
- Succès → redirection / invitation à se connecter.
- Connexion avec le **nouveau** mot de passe : OK. Avec l'ancien : refusée.
- Token consommé (réutilisation → erreur). Token expiré → erreur.
- Email inexistant en étape 2 → **même** message neutre, aucun e-mail.

### 3.5 Acceptation des CGU (compte existant, version bloquante)

**Objectif** : un membre dont l'acceptation CGU n'est pas à jour est forcé de ré-accepter.

**Préconditions** : compte avec `acceptedTermsAt` null / antérieur à la version courante.

**Étapes**
1. Se connecter, tenter d'aller sur n'importe quelle route protégée.
2. `termsGuard` redirige vers `/legal/accept`.
3. Cocher, valider → `POST /api/v1/auth/accept-terms`.

**Assertions**
- Avant acceptation : toute route `authGuard` renvoie sur `/legal/accept` (impossible de
  contourner en tapant l'URL).
- Après acceptation : accès normal, plus de redirection.

### 3.6 Déconnexion

1. Depuis la sidebar / le menu profil → « Se déconnecter » → `POST /auth/logout`.
- Cookie refresh effacé, retour sur `/auth/login`.
- Retaper `/accueil` → `authGuard` renvoie sur `/auth/login`.

### 3.7 Bouton Google (conditionnel)

- Si `googleClientId` défini → le bouton « Continuer avec Google » est présent sur
  `/auth/login` et `/auth/signup`.
- Si vide → le bouton est **absent**.
- (Le flux OAuth lui-même n'est pas automatisé.)

---

## 4. Parcours PROFIL

### 4.1 Consulter son profil / dashboard

**Objectif** : le membre voit ses infos + ses stats.

**Étapes** : `/profile`.

**Assertions**
- Nom, avatar (ou monogramme), ville, club, **niveau en 5 dots** (N1→N5) avec libellé.
- **Le rating ELO brut n'est JAMAIS affiché** (règle produit — voir mémoire) : on montre
  le niveau, les points/l'enjeu, jamais le nombre.
- Stats : nb de matchs, victoires/défaites, éventuellement forme récente.
- Section **badges** (séries + hauts faits) — voir §10.

### 4.2 Éditer son profil

**Étapes**
1. `/profile` → « Modifier ».
2. Changer bio, ville, club, raquette, courts préférés, créneaux préférés, âge.
3. Enregistrer → `PATCH /api/v1/members/me`.

**Assertions**
- Les valeurs persistent après reload.
- Validation Zod côté API : payloads invalides rejetés (ex. âge négatif).
- Le nom mis à jour se répercute sur la fiche membre publique.

### 4.3 Changer d'avatar

1. `/profile` → upload image → `POST /api/v1/members/me/avatar` (Cloudinary `atc/avatars`).
- Sans clés Cloudinary : mocker la route ou sauter l'assertion visuelle.
- Assertion : `avatarUrl` renseigné, l'image (ou son `src`) change dans la topbar.

---

## 5. Parcours MEMBRES (annuaire)

### 5.1 Parcourir et filtrer l'annuaire

**Étapes** : `/members`.

**Assertions**
- Liste paginée de membres (données seed).
- Filtres : **niveau** (1–5), **en ligne** (`online`), **ville**, **club** (par slug,
  via `?club=<slug>`), **recherche texte** (`q` sur le nom).
- Combinaison de filtres = intersection. `GET /api/v1/members?level=3&city=Cocody…`.
- État vide (`app-empty-state`) si aucun résultat.
- Le lien « club » depuis une fiche club amène ici pré-filtré.

### 5.2 Consulter une fiche membre

**Étapes** : cliquer un membre → `/members/:id`.

**Assertions**
- Hero (nom, avatar, niveau, ville, club), bio, raquette, préférences.
- Historique / stats publiques du joueur.
- **Ses badges** (`GET /api/v1/badges/:userId`).
- Bloc **« Défier »** présent si ce n'est pas soi-même (voir §7).
- Pas de rating brut.

---

## 6. Parcours ANNONCES DE MATCH (DispoPost) — trouver un adversaire

Route : `/matchs?vue=trouver` (composant `match-finder`, sous-onglets **Feed** / **Mes annonces**).

### 6.1 Publier une annonce de disponibilité

**Objectif** : A publie « je suis dispo tel jour, tel court ».

**Étapes**
1. `/matchs?vue=trouver` → bouton « Publier une annonce » (`toggleCreate`).
2. Renseigner : date/heure (`when`, futur), durée (minutes), court (nom de club), type
   (**simple / double / mixte** — boutons), note optionnelle.
3. Soumettre → `POST /api/v1/dispos`.

**Assertions**
- L'annonce apparaît dans l'onglet **« Mes annonces »** et en tête du **Feed**.
- Émission Socket.IO `dispo:new` (autres sessions voient l'annonce arriver — cf. §12).
- Champs invalides (date passée, durée ≤ 0) → refus Zod.

### 6.2 Répondre à une annonce (demander à participer)

**Objectif** : B voit l'annonce de A et demande à jouer.

**Préconditions** : une annonce de A existe, future, sans invité retenu.

**Étapes**
1. B : `/matchs?vue=trouver`, onglet **Feed**.
2. Sur la carte de l'annonce de A → bouton **« Participer »** (`joinDispo`) →
   `POST /api/v1/dispos/:id/request`.

**Assertions**
- B voit un état « demande envoyée » sur la carte.
- A reçoit une **notification** `match_request` (badge cloche +1, item dans
  `/notifications`).
- Côté A, l'annonce (onglet « Mes annonces ») liste la demande de B avec **Accepter /
  Refuser**.
- B ne peut pas demander 2× la même annonce (idempotent ou bouton désactivé).
- On ne peut pas répondre à sa propre annonce.

### 6.3 Accepter une demande / choisir un invité

**Objectif** : A retient B comme adversaire.

**Modèle** (voir mémoire *annonce-acceptance-model*) : **une DispoPost = un seul invité
retenu**. Accepter B ⇒ les autres demandes `pending` passent `declined` automatiquement.

**Étapes**
1. A : onglet « Mes annonces » → demande de B → **« Accepter »** →
   `POST /api/v1/dispos/:id/requests/:reqId/accept`.

**Assertions**
- La demande de B → `accepted` ; les autres `pending` → `declined` (+ notif
  `match_declined` à ceux-là).
- B reçoit une notif `match_confirmed` (ou équivalent) + un e-mail.
- **Une conversation 1-to-1 A↔B est créée** (`ensureConversationForDispo`) et visible
  dans `/messages` des deux côtés.
- Le match « à venir » apparaît dans **`/matchs?vue=mes-matchs` → onglet « À venir »**
  des deux joueurs (état : pas encore de score → `Match` non encore créé).

### 6.4 Changer d'adversaire après acceptation

**Objectif** : A a accepté B, puis choisit C à la place.

**Étapes**
1. A : sur l'annonce, choisir une autre demande → **« Choisir à la place »**
   (`acceptRequest` sur un autre `reqId`).

**Assertions**
- L'ancien invité (B) repasse `declined` + reçoit une notif de désistement.
- Une **nouvelle** conversation / **reset** de la conversation avec C (cf. mémoire :
  « changer d'adversaire » ⇒ notif + reset conversation).
- C est le nouvel invité retenu.

### 6.5 Supprimer / retirer une annonce ou une demande

- A supprime son annonce → `DELETE /api/v1/dispos/:id` → disparaît du Feed et de « Mes
  annonces ».
- B retire sa demande (`decline` côté requester) → l'annonce redevient ouverte.

### 6.6 Filtres du Feed

- Pills de filtre par **type** (Tous / simple / double / mixte), + filtres `date`,
  `level`, `court` via l'API.
- État vide → CTA « Créer ma première annonce ».

---

## 7. Parcours DÉFI DIRECT (QuickMatch)

**Objectif** : A défie nommément B depuis sa fiche.

Route de départ : `/members/:id` (fiche de B). Suivi : `/matchs?vue=mes-matchs` →
onglet **« Défis »** (sections **Défis reçus** / **Défis envoyés**).

### 7.1 Envoyer un défi

**Étapes**
1. A : `/members/<B>` → bloc « Défier » (`toggleChallenge`).
2. Renseigner date/heure (`when`), court, type (simple/double/mixte), note optionnelle.
3. Envoyer → `POST /api/v1/quick-matches` (`{ challengedId, when, court, type, note }`).

**Assertions**
- État « défi envoyé » sur la fiche.
- B reçoit une notif `quick_match_request` + un e-mail `challenge_received`.
- Côté A : le défi est dans **« Défis envoyés »** (statut *en attente*).
- Côté B : le défi est dans **« Défis reçus »** avec **Accepter / Refuser**.

### 7.2 Accepter un défi

**Étapes**
1. B : onglet « Défis » → « Accepter » → `POST /api/v1/quick-matches/:id/accept`.

**Assertions**
- Statut → `accepted`.
- A reçoit notif + e-mail `challenge_accepted`.
- Le match passe en **« À venir »** (source `quick`) chez les deux.
- Conversation 1-to-1 A↔B disponible.

### 7.3 Refuser un défi

1. B → « Refuser » → `POST /api/v1/quick-matches/:id/decline`.
- Statut → `declined` ; A reçoit e-mail `challenge_declined` ; le défi quitte les listes
  actives.

---

## 8. Parcours SCORE (cycle de vie d'un match joué)

Route : `/matchs?vue=mes-matchs`. Sections successives : **À venir** → **En attente de
confirmation** → **Score à valider** → **Historique**.

Rappel : **les deux joueurs peuvent saisir le score**. Le second joueur **valide** ou
**conteste**. À la validation, le `Match` est confirmé et l'ELO / le niveau sont mis à
jour (le **niveau ne bouge qu'après 5 matchs confirmés** — cf. mémoire *niveau-engine-elo*).

### 8.1 Saisir le score

**Préconditions** : un match « À venir » existe entre A et B (via annonce acceptée §6.3
ou défi accepté §7.2), date passée ou proche.

**Étapes**
1. A : sur la carte du match → **« Saisir le score »** → formulaire inline.
2. Entrer les sets (ex. `6-4 7-5`). Le vainqueur est déduit des sets.
3. Soumettre → `POST /api/v1/matches` (`{ dispoId | quickMatchId, scoreHost, scoreGuest,
   playedAt, court, type }`, l'API gère l'ordre host/guest).

**Assertions**
- Le match passe côté A en **« En attente de confirmation »** (score soumis par moi).
- Côté B : **« Score à valider »** + notif + e-mail `score_to_validate`.
- Sets incohérents (impossible de déterminer un vainqueur) → erreur
  « Impossible de déterminer le vainqueur », rien n'est enregistré.
- (Audit sécu : bornes de longueur sur `score` / `note` — payloads géants rejetés.)

### 8.2 Valider le score (adversaire)

**Étapes**
1. B : section « Score à valider » → **« Valider »** →
   `PATCH /api/v1/matches/:id/validate` (accepté).

**Assertions**
- Le `Match` est **confirmé** : visible dans **Historique** des deux joueurs, avec
  scoreboard, V/D, date, court.
- ELO recalculé (`applyEloUpdate`) — **jamais affiché en brut**, mais :
  - le **classement** (`/rankings`) peut bouger ;
  - après le 5ᵉ match confirmé, le **niveau (dots)** peut changer, pas avant.
- A reçoit notif + e-mail `score_confirmed` (won/lost correct).
- Les **badges** / **hauts faits** peuvent se débloquer (ex. 1re victoire) — §10.
- La **carte de match partageable** devient disponible sur ce match — §11.

### 8.3 Contester le score (litige)

**Étapes**
1. B : « Score à valider » → **« Contester »** → `PATCH /api/v1/matches/:id/validate`
   (refusé / disputed).

**Assertions**
- Le match passe en état **litige** ; A reçoit e-mail `score_disputed`.
- Le match **n'est pas** compté (pas d'ELO, pas d'historique confirmé).
- Il apparaît dans **`/admin` → onglet « Litiges »** (`GET /api/v1/admin/matches/disputed`).

### 8.4 Résolution du litige (admin)

**Étapes**
1. Admin : `/admin?tab=disputes` → choisir le score correct / trancher →
   `POST /api/v1/admin/matches/:id/resolve`.

**Assertions**
- Le match sort de la liste des litiges.
- Score final appliqué, ELO mis à jour, historique confirmé chez les deux joueurs.

---

## 9. Parcours MESSAGERIE 1-to-1

Routes : `/messages` (liste des conversations), `/messages/:id` (fil).

Rappel : **1 conversation = 1 relation entre 2 joueurs** (pas 1 par match). Créée à
l'acceptation d'une annonce (§6.3) ou d'un défi (§7.2). Conservée même si une demande est
ensuite refusée.

### 9.1 Ouvrir une conversation et échanger

**Préconditions** : conversation A↔B existante.

**Étapes**
1. A : `/messages` → sélectionner la conversation avec B → `/messages/:id`.
2. Écrire un message, envoyer → `POST /api/v1/messaging/:id/messages` (rate-limité
   `sendLimiter`).

**Assertions**
- Le message s'affiche dans le fil de A immédiatement.
- B : **badge non-lus** +1 (`GET /api/v1/messaging/unread-count`), le message apparaît
  dans son fil (temps réel Socket.IO ou au reload — §12).
- B reçoit un e-mail `message_received` (selon règle anti-spam / présence).
- Quand B ouvre le fil → `POST /api/v1/messaging/:id/read` → badge non-lus revient à 0.

### 9.2 Lien profond depuis une notification

- Une notif de message / demande pointe vers la bonne conversation
  (`GET /api/v1/messaging/by-source/:source/:sourceId`) → clic → `/messages/:id` correct.

### 9.3 Reset de conversation au changement d'adversaire

- Voir §6.4 : après « changer d'adversaire », la conversation avec l'ancien invité n'est
  plus le canal actif du match ; la nouvelle relation a sa conversation.

---

## 10. Parcours BADGES

Rappel (mémoire *badges-feature*) : **3 séries** calculées à la lecture + **10 hauts
faits** stockés (table `Achievement`). Socle back livré, front en cours.

### 10.1 Voir ses badges

**Étapes** : `/profile` → section badges (`GET /api/v1/badges/me`).

**Assertions**
- Les 3 séries affichent la progression (palier courant).
- Les hauts faits déjà obtenus sont en écussons « pleins », les autres verrouillés.
- Chaque badge a son **icône dédiée**.

### 10.2 Débloquer un haut fait

**Étapes** : réaliser l'action déclencheuse (ex. 1re victoire confirmée via §8.2).

**Assertions**
- Après la confirmation du match, `GET /api/v1/badges/me` contient le nouveau haut fait.
- (Si notif de déblocage prévue) une notif / un toast apparaît.
- Le badge est aussi visible sur la fiche publique (`/members/:id`).

---

## 11. Parcours CARTES DE MATCH

### 11.1 Carte d'enjeu (avant le match)

Rappel (mémoire *carte-enjeu-match*) : encart **motivant** sur un match à jouer —
probabilité ELO de victoire + points en jeu + bande. **Rating brut jamais exposé.**
Seulement pour les **matchs simples** où les deux joueurs ont assez de matchs classés.

**Étapes** : `/matchs?vue=mes-matchs` → onglet « À venir » → carte d'un match éligible.

**Assertions**
- Encart présent avec proba (%) + points en jeu + libellé de bande.
- Aucun nombre de rating affiché.
- Match non éligible (double/mixte, ou < seuil de matchs classés) → **pas d'encart**
  (`stakes: null`).

### 11.2 Carte de match partageable (après confirmation)

Rappel (mémoire *carte-match-partageable*) : image « story » 1080×1920 générée en
**canvas côté client**, partage natif (WhatsApp / Instagram). Lot 1 = client-only.

**Étapes** : `/matchs?vue=mes-matchs` → Historique → match confirmé → « Partager ».

**Assertions**
- Un `<canvas>` de 1080×1920 est produit (noms, score, date, court, identité ATC).
- Bouton de partage : `navigator.share` si dispo, sinon fallback (téléchargement /
  copie). En E2E : vérifier que le canvas est rendu et non vide ; mocker `navigator.share`.

---

## 12. Parcours NOTIFICATIONS & TEMPS RÉEL

Route : `/notifications` ; badge/cloche dans la **topbar**.

### 12.1 Fil de notifications

**Assertions**
- `/notifications` liste les notifs (`GET /api/v1/notifications/me`), non-lues en tête /
  marquées.
- Types couverts : `match_request`, `match_confirmed` / `match_declined`,
  `quick_match_request`, `score_to_validate`, `score_confirmed`, `score_disputed`,
  `news`, message.
- Clic sur une notif → navigation vers la cible (annonce, défi, match, conversation,
  article).
- « Tout marquer comme lu » → `PATCH /api/v1/notifications/read-all` → badge à 0.
- Marquer une seule → `PATCH /api/v1/notifications/:id/read`.

### 12.2 Temps réel (Socket.IO) — 2 sessions

**Setup** : deux `browserContext` (A et B) connectés simultanément.

**Assertions** (au choix des scénarios) :
- A publie une annonce → B (sur le Feed) voit la carte apparaître sans reload
  (`dispo:new`).
- B demande à participer → A voit le compteur de notifs augmenter (`match:request` /
  `notification:new`).
- Présence : A se connecte → B voit A « en ligne » (`member:online`) ; A ferme →
  `member:offline`.
- Tolérance : si le temps réel est instable en CI, autoriser un `reload()` + re-assert.

### 12.3 Push Web / PWA (dégradé en E2E)

- `manifest` présent, `sw.js` enregistré, app installable (vérifier les critères PWA).
- `vapidPublicKey` vide → pas de prompt d'abonnement push ; on s'appuie sur le badge
  in-app + l'e-mail. **Ne pas** tenter d'assert la réception d'une push réelle en local.
- Si clés VAPID fournies en CI : `POST /api/v1/push/subscribe` puis broadcast admin
  (§13.5) — test avancé, optionnel.

---

## 13. Parcours ADMIN (`/admin`, `adminGuard`)

Onglets : **Litiges · Clubs · Niveaux · Membres · Notifications · Actualité**
(query param `?tab=`).

### 13.0 Contrôle d'accès

- Membre non-admin sur `/admin` → `adminGuard` redirige (vers `/accueil`).
- Lien « Admin » absent de la sidebar pour un non-admin, présent pour un admin.

### 13.1 Litiges

- Voir §8.4.

### 13.2 Clubs (CRUD + lieu)

**Étapes**
1. `/admin?tab=clubs` → « Nouveau club » → nom, ville, adresse, honoraires, contact,
   site, **position sur carte Leaflet** (lat/lng) → `POST /api/v1/admin/clubs`.
2. Éditer → `PATCH /api/v1/admin/clubs/:id`.
3. Upload photo → `POST /api/v1/admin/clubs/:id/image` (Cloudinary `atc/clubs`, 800×500).
4. Désactiver / supprimer → `DELETE /api/v1/admin/clubs/:id`.

**Assertions**
- Le club actif apparaît dans `GET /api/v1/clubs` (public), sur `/clubs`, dans les
  sélecteurs de profil / annonce.
- Le club inactif renvoie 404 sur `/clubs/:slug`.
- `lat`/`lng` alimentent la carte OpenStreetMap des matchs joués sur ce club.

### 13.3 Niveaux

- `/admin?tab=levels` → éditer libellé + descriptions d'un niveau →
  `PATCH /api/v1/admin/levels/:level`.
- Assertion : `GET /api/v1/levels` (public) et l'affichage 5 dots reflètent le nouveau
  libellé. **Les bornes ELO ne sont pas éditables** (code `elo.ts`).

### 13.4 Membres / rôles

- `/admin?tab=members` → promouvoir un membre `member` → `admin` (et inverse) →
  `PATCH /api/v1/admin/members/:id/role`.
- Assertion : le membre promu voit le lien « Admin » à sa prochaine session / au refresh
  du `me`.

### 13.5 Notifications (broadcast push)

- `/admin?tab=push` → stats (`GET /api/v1/admin/push/stats`), envoyer un broadcast
  (`POST /api/v1/admin/push/broadcast`).
- Assertion (dégradée) : l'appel réussit ; réception réelle non testée en local.

### 13.6 Actualité (CRUD + programmation)

Rappel (mémoire *actualite-epic*) : modèle `Post` unique, visibilité **calculée à la
lecture** ; un **tick serveur toutes les 5 min** bascule les publications programmées
échues (pas de cron dédié).

**Étapes**
1. `/admin?tab=news` → créer un article : titre, slug, contenu, type (news / événement),
   date de publication (immédiate ou **programmée**), éventuelle date d'événement.
2. Publier / programmer.

**Assertions**
- Article **publié maintenant** → visible sur `/actualite`, `/actualite/:slug`, dans le
  flux RSS, et une notif `news` peut partir.
- Article **programmé futur** → **absent** de `/actualite` public, visible seulement en
  admin (marqué « programmé »).
- Après l'échéance (simuler : avancer la date, ou attendre le tick / déclencher
  manuellement) → l'article devient public.
- Événement → visible aussi sur `/actualite/evenements`.

---

## 14. Parcours ACTUALITÉ (côté membre)

- `/actualite` : liste des articles publiés (cartes), pagination éventuelle.
- `/actualite/:slug` : détail (titre, date, contenu rendu — **pas de `[innerHTML]` de
  données brutes**, échappement Angular).
- `/actualite/evenements` : sous-liste des événements, avec date d'événement.
- Flux **RSS** : endpoint dédié renvoie du XML valide avec les derniers articles publiés.
- Un slug inconnu → état « article introuvable » / redirection, pas de crash.

---

## 15. Parcours CLUBS (côté membre)

### 15.1 Annuaire des clubs

- `/clubs` : **grille de cartes visuelles** (photo ou dégradé + monogramme, nom,
  localisation, nb de membres ATC, cœur favori).
- **Favori** : clic sur le cœur → stocké en **localStorage** (`ClubFavoritesService`,
  par appareil) → les favoris remontent en tête. Assertion : recharger la page conserve
  le favori ; un autre `browserContext` ne le voit pas.

### 15.2 Fiche club

- `/clubs/:slug` : hero photo, présentation, adresse, honoraires, contact / site,
  **aperçu des 12 premiers membres** + lien « voir tous » → `/members?club=<slug>`.
- Club inactif / inconnu → 404 / état vide.

---

## 16. Parcours CARTE DU LIEU D'UN MATCH

Rappel (mémoire *court-map-feature*) : carte **OpenStreetMap** (sans clé API), le **Club
est l'entité lieu** (`Club.lat`/`lng`), rapprochement par `Club.name`.

- Depuis une carte d'annonce / de match : bouton « Voir sur la carte » (`openCourtMap`).
- Assertion : une carte (tuiles OSM) s'affiche, centrée sur le club, avec un marqueur ;
  lien « itinéraire » ouvre l'app de navigation (mocker en E2E).
- Court dont le nom ne correspond à aucun club → pas de carte / message neutre.

---

## 17. Parcours ACCUEIL (lanceur)

- `/accueil` : **grille de 6 widgets illustrés** → Créer une annonce, Membres, Clubs,
  Classement, Mes matchs, Profil.
- Assertion : chaque tuile navigue vers la bonne route.
- Widgets « dynamiques » éventuels (prochains matchs, notifs récentes) affichent les
  bonnes données seed.

---

## 18. Parcours CLASSEMENT

- `/rankings` (`GET /api/v1/members/rankings`).
- Assertion : liste ordonnée des joueurs ; **le rating brut n'est pas affiché** — on
  montre rang, niveau (dots), nb de matchs, ratio V/D.
- Après un match confirmé (§8.2) qui fait bouger l'ELO → l'ordre peut changer au reload.

---

## 19. Parcours transversaux (à vérifier sur plusieurs pages)

| Thème | Ce qu'on vérifie |
|---|---|
| **Responsive** | ≥768px : sidebar visible, pas de bottom-nav. <768px : bottom-nav visible, sidebar masquée. Pas de scroll horizontal. |
| **Guards** | `authGuard` : route protégée sans session → `/auth/login`. `guestGuard` : `/` et `/auth/*` avec session → `/accueil`. `adminGuard` : `/admin` sans rôle → `/accueil`. `termsGuard` : CGU périmées → `/legal/accept`. Route inconnue `**` → `/accueil`. |
| **i18n** | Tous les textes en français, format date `dd MMMM yyyy`, pas de chaîne anglaise en dur. |
| **A11y** | Navigation clavier (focus visible), éléments cliquables focusables, `prefers-reduced-motion` respecté, contrastes texte discret OK. |
| **Sécurité affichage** | Injecter `<script>`/`<b>` dans nom / note / score → affiché **échappé**, jamais interprété. |
| **Session expirée** | Access token expiré (15 min) → l'intercepteur tente un `POST /auth/refresh` ; refresh mort → déconnexion propre vers `/auth/login`. |
| **États vides** | Chaque liste (membres, feed, défis, messages, historique, notifs, actualité) a un `app-empty-state` cohérent avec CTA. |
| **États d'erreur API** | 500 / réseau coupé → message d'erreur non bloquant, pas d'écran blanc. |

---

## 20. Priorisation pour l'automatisation

**Flows critiques (CLAUDE.md — à faire en premier)** :
1. Inscription (§3.1)
2. Connexion (§3.3)
3. Publier une annonce (§6.1)
4. Répondre + accepter une demande (§6.2 + §6.3)
5. Cycle de score complet : saisie → validation → historique (§8.1 + §8.2)

**Puis** : défi direct (§7), messagerie (§9), litige + résolution admin (§8.3 + §8.4),
mot de passe oublié (§3.4, dépend du mail-catcher), admin clubs/actualité (§13.2, §13.6).

**Enfin / dégradé** : temps réel 2 sessions (§12.2), badges (§10), cartes de match (§11),
push (§12.3), favoris clubs (§15.1), carte OSM (§16).

---

## 21. Structure Playwright proposée

```
apps/web/e2e/
  playwright.config.ts        # baseURL http://localhost:4200, projets chromium (+ mobile viewport)
  fixtures/
    db.ts                     # reset + seed avant chaque suite (via API ou script prisma)
    auth.ts                   # helpers : signup(), login(), loginAs('seedPlayerX'), makeAdmin()
    mail.ts                   # lecture du mail-catcher de test (token verify / reset)
  specs/
    auth-signup.spec.ts
    auth-login.spec.ts
    auth-password-reset.spec.ts
    profile.spec.ts
    members-directory.spec.ts
    dispo-publish-and-join.spec.ts
    dispo-accept-and-swap.spec.ts
    quick-match.spec.ts
    score-lifecycle.spec.ts
    score-dispute-admin.spec.ts
    messaging.spec.ts
    notifications-realtime.spec.ts   # 2 contexts
    admin-clubs.spec.ts
    admin-news.spec.ts
    clubs.spec.ts
    rankings.spec.ts
    guards.spec.ts
```

Conventions : chaque spec est **indépendante** (crée ses propres données via l'API dans un
`beforeEach`, pas de dépendance à l'ordre) ; sélecteurs via `data-testid` à ajouter sur
les éléments clés (boutons Participer / Accepter / Saisir le score / Valider / Contester,
champs de formulaire, badges d'état).

---

### Actions à confirmer avec le PO / avant de coder

- [ ] Ajouter le **mail-catcher de test** dans l'API (§0.3.1) — sinon 3.2 et 3.4 sautent.
- [ ] Choisir la stratégie **DB E2E** : re-seed complet vs base `atc_e2e` (§0.3.2).
- [ ] Ajouter les `data-testid` nécessaires côté front.
- [ ] Décider du périmètre **temps réel** (2 contexts) vs reload.
- [ ] Mocks : `navigator.share`, Cloudinary, itinéraire de carte.
