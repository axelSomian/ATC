-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "allowedLicenceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

