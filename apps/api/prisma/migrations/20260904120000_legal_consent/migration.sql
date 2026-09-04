-- Acceptation des CGU + politique de confidentialité.
-- Colonnes null par défaut : TOUS les comptes (existants inclus) devront accepter
-- au prochain accès (écran /legal/accept côté front).

ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "termsVersion"    TEXT;
