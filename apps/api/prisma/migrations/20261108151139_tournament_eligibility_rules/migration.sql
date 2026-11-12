-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "genderRule" TEXT,
ADD COLUMN     "maxLevel" INTEGER,
ADD COLUMN     "minLevel" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT;

