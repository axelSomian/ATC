-- Fusion Terrain -> Club : Club devient l'unique entité « lieu ».
-- (données Court = seed obsolète, non conservées — projet en dev.)
ALTER TABLE "Club" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "Club" ADD COLUMN "lng" DOUBLE PRECISION;

DROP TABLE IF EXISTS "Court";
