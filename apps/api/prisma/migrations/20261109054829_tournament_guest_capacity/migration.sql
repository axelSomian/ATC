-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "maxPlayers" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

