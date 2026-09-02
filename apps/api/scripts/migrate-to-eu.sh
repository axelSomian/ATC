#!/usr/bin/env bash
# Migration de la base Neon vers une nouvelle région (co-localisation avec Render).
#
# Depuis apps/api/ , après avoir exporté les URLs de la NOUVELLE base :
#   export NEW_POOLED='postgresql://...-pooler.<region>.aws.neon.tech/neondb?sslmode=require&pgbouncer=true'
#   export NEW_DIRECT='postgresql://...<region>.aws.neon.tech/neondb?sslmode=require'   # sans -pooler
#   bash scripts/migrate-to-eu.sh
set -euo pipefail

: "${NEW_POOLED:?exporte NEW_POOLED (URL pooled de la nouvelle base)}"
: "${NEW_DIRECT:?exporte NEW_DIRECT (URL directe, sans -pooler)}"

OLD_DIRECT="$(grep '^DIRECT_URL=' .env | cut -d= -f2-)"
[ -n "$OLD_DIRECT" ] || { echo "DIRECT_URL introuvable dans .env"; exit 1; }

echo "==> 1/3  Schéma sur la nouvelle base (prisma migrate deploy)"
DATABASE_URL="$NEW_POOLED" DIRECT_URL="$NEW_DIRECT" npx prisma migrate deploy

echo
echo "==> 2/3  Copie des données (ancienne -> nouvelle)"
SRC_URL="$OLD_DIRECT" DST_URL="$NEW_DIRECT" npx tsx scripts/copy-db.ts --wipe

echo
echo "==> 3/3  Vérification"
DATABASE_URL="$NEW_POOLED" DIRECT_URL="$NEW_DIRECT" npx prisma migrate status

cat <<'EOF'

OK. Étapes manuelles restantes :
  1. apps/api/.env      : DATABASE_URL = $NEW_POOLED , DIRECT_URL = $NEW_DIRECT
  2. Render (atc-api > Environment) : idem, puis "Manual Deploy > Clear build cache & deploy"
  3. Après bascule Render, resync des lignes créées pendant la coupure :
     SRC_URL="<ancienne DIRECT_URL>" DST_URL="$NEW_DIRECT" \
       npx tsx scripts/copy-db.ts --delta <ISO_de_l_heure_de_la_copie>
EOF
