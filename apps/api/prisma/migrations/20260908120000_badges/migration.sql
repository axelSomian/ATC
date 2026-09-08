-- Contexte du match figé au moment de l'application de l'ELO (badges).
ALTER TABLE "Match" ADD COLUMN "hostRatingBefore" INTEGER;
ALTER TABLE "Match" ADD COLUMN "guestRatingBefore" INTEGER;
ALTER TABLE "Match" ADD COLUMN "wasDisputed" BOOLEAN NOT NULL DEFAULT false;

-- Hauts faits débloqués (permanents).
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" JSONB,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Achievement_userId_code_key" ON "Achievement"("userId", "code");
CREATE INDEX "Achievement_userId_idx" ON "Achievement"("userId");

ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
