-- AlterTable
ALTER TABLE "User" DROP COLUMN "club",
ADD COLUMN     "clubId" TEXT;

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "level" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "profil" TEXT NOT NULL,
    "jeu" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("level")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "Club_active_sortOrder_idx" ON "Club"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "User_clubId_idx" ON "User"("clubId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: clubs de tennis d'Abidjan (idempotent — un admin peut ensuite les modifier)
INSERT INTO "Club" ("id", "slug", "name", "zone", "location", "active", "sortOrder") VALUES
  ('club_lctc',           'lctc',           'Le Central Tennis Club (LCTC)',                'Cocody',   'Sofitel Hôtel Ivoire, Bd Hassan II',                       true, 1),
  ('club_ntc',            'ntc',            'N''Goran Tennis Concept (NTC)',                'Cocody',   'Club Municipal des 2 Plateaux (derrière l''ancien SOCOCE)', true, 2),
  ('club_nourra',         'nourra',         'Nourra Tennis Club',                          'Cocody',   'SODECI, secteur Riviera–Cocody',                           true, 3),
  ('club_chateau_sodeci', 'chateau-sodeci', 'Club de tennis le Château SODECI',            'Cocody',   'Secteur Allocodrome / SODECI',                             true, 4),
  ('club_auc',            'auc',            'A.U.C. Tennis — Université FHB',               'Cocody',   'Université Félix Houphouët-Boigny',                        true, 5),
  ('club_athletic',       'athletic',       'Athlétic Club',                               'Marcory',  'Boulevard de Marseille',                                   true, 6),
  ('club_golf',           'golf',           'Golf Tennis Club',                            'Cocody',   'Hôtel du Golf / Riviera Golf',                             true, 7),
  ('club_sol_beni',       'sol-beni',       'Sol Béni',                                    'Cocody',   'Complexe sportif Sol Béni, Riviera',                       true, 8),
  ('club_sotra',          'sotra',          'Sotra Tennis Academy',                        'Marcory',  'Secteur Marcory / Treichville',                            true, 9),
  ('club_yop',            'yop',            'Yop Tennis Academy',                          'Yopougon', '',                                                        true, 10),
  ('club_anah',           'anah',           'Centre de Tennis Anah 2 Plateaux (FIT)',      'Cocody',   'Deux-Plateaux',                                            true, 11),
  ('club_autre',          'autre',          'Autre / non affilié·e',                       '',         '',                                                        true, 99)
ON CONFLICT ("slug") DO NOTHING;

-- Seed: 5 niveaux (le texte est éditable par un admin ; les bornes ELO sont dans le code)
INSERT INTO "Level" ("level", "code", "nom", "profil", "jeu") VALUES
  (1, 'N1', 'Débutant·e',    'Découverte du tennis',                      'Ne joue pas encore réellement de match'),
  (2, 'N2', 'Initié·e',      'Fondamentaux acquis',                       'Peut commencer à jouer des points et de petits sets'),
  (3, 'N3', 'Intermédiaire', 'Joue régulièrement',                        'Peut jouer un set complet et construire un échange'),
  (4, 'N4', 'Avancé·e',      'Bonne maîtrise technique et tactique',      'Joue des matchs régulièrement'),
  (5, 'N5', 'Compétition',   'Niveau élevé et forte expérience',          'Compétition ou niveau proche de la compétition')
ON CONFLICT ("level") DO NOTHING;
