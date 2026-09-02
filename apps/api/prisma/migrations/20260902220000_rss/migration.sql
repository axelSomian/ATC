-- Agrégation RSS pour la catégorie « Infos Tennis ».

ALTER TABLE "Post" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Post" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "Post_externalId_key" ON "Post"("externalId");

CREATE TABLE "RssFeed" (
    "id"          TEXT NOT NULL,
    "url"         TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt"  TIMESTAMP(3),
    "lastError"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RssFeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RssFeed_url_key" ON "RssFeed"("url");
