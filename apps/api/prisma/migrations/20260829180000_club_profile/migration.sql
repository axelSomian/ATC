-- Fiche club : adresse, présentation, honoraires, contact, site web.
ALTER TABLE "Club" ADD COLUMN "address" TEXT;
ALTER TABLE "Club" ADD COLUMN "description" TEXT;
ALTER TABLE "Club" ADD COLUMN "feesInfo" TEXT;
ALTER TABLE "Club" ADD COLUMN "phone" TEXT;
ALTER TABLE "Club" ADD COLUMN "website" TEXT;
