-- Classement façon ATP (2026-11-14).
-- `minLevel` supprimé : le surclassement est autorisé, seul le niveau du
-- tournoi (`maxLevel`) borne l'inscription. Vérifié le 14/11 : toutes les
-- lignes de prod avaient `minLevel = NULL`, aucune donnée perdue.
-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "minLevel",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE "TournamentResult" ADD COLUMN     "category" TEXT,
ADD COLUMN     "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "level" INTEGER,
ADD COLUMN     "roundReached" INTEGER,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "LevelChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "tournamentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "revertedAt" TIMESTAMP(3),
    "revertedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LevelChange_createdAt_idx" ON "LevelChange"("createdAt");

-- CreateIndex
CREATE INDEX "LevelChange_userId_idx" ON "LevelChange"("userId");

-- CreateIndex
CREATE INDEX "TournamentResult_userId_earnedAt_idx" ON "TournamentResult"("userId", "earnedAt");

-- AddForeignKey
ALTER TABLE "LevelChange" ADD CONSTRAINT "LevelChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise : les points déjà saisis à la main datent de la fin de leur tournoi
-- (point de départ de l'expiration à 12 mois) et restent `source = 'manual'`.
UPDATE "TournamentResult" r
SET "earnedAt" = t."endDate"
FROM "Tournament" t
WHERE t."id" = r."tournamentId";
