/*
  Warnings:

  - Added the required column `birthDate` to the `Licence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthPlace` to the `Licence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Licence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Licence" ADD COLUMN     "birthDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "birthPlace" TEXT NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "disciplines" TEXT[];
