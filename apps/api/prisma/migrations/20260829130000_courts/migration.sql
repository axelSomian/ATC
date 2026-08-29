-- Catalogue des terrains / lieux de jeu, éditable par un admin.
-- Les coordonnées sont approximatives (centroïde de zone pour les entrées génériques) —
-- un admin les affine terrain par terrain via l'espace d'administration.
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Court_slug_key" ON "Court"("slug");
CREATE INDEX "Court_active_sortOrder_idx" ON "Court"("active", "sortOrder");

INSERT INTO "Court" ("id", "slug", "name", "zone", "address", "lat", "lng", "sortOrder") VALUES
  ('court_club_ivoire',      'club-ivoire',         'Club Ivoire',          'Cocody',      'Sofitel Hôtel Ivoire, Bd Hassan II, Cocody',  5.32420, -4.00880, 1),
  ('court_plateau_tc',       'plateau-tennis-club', 'Plateau Tennis Club',  'Plateau',     'Plateau, Abidjan',                             5.32680, -4.01970, 2),
  ('court_insep',            'insep',               'INSEP',                'Marcory',     'Marcory, Abidjan',                             5.29500, -3.99700, 3),
  ('court_cocody',           'cocody',              'Cocody',               'Cocody',      'Cocody, Abidjan',                              5.34800, -3.98700, 4),
  ('court_ii_plateaux',      'ii-plateaux',         'II Plateaux',          'Cocody',      'II Plateaux, Cocody',                          5.37200, -3.99900, 5),
  ('court_riviera',          'riviera',             'Riviera',              'Cocody',      'Riviera, Cocody',                              5.35600, -3.95200, 6),
  ('court_marcory',          'marcory',             'Marcory',              'Marcory',     'Marcory, Abidjan',                             5.28720, -3.98800, 7),
  ('court_treichville',      'treichville',         'Treichville',          'Treichville', 'Treichville, Abidjan',                         5.29300, -4.00600, 8),
  ('court_yopougon',         'yopougon',            'Yopougon',             'Yopougon',    'Yopougon, Abidjan',                            5.33800, -4.07100, 9);
