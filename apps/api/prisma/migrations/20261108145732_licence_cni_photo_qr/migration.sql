-- AlterTable
ALTER TABLE "Licence" ADD COLUMN     "cniUrl" TEXT NOT NULL,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "licenceNumber" TEXT NOT NULL,
ADD COLUMN     "photoUrl" TEXT NOT NULL,
ADD COLUMN     "verificationCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Licence_licenceNumber_key" ON "Licence"("licenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Licence_verificationCode_key" ON "Licence"("verificationCode");

