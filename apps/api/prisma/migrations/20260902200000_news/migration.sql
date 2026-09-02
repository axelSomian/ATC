-- Rubrique Actualité : table Post (tournois, événements, partenariats, infos tennis, news ATC).

CREATE TABLE "Post" (
    "id"              TEXT NOT NULL,
    "category"        TEXT NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'draft',
    "title"           TEXT NOT NULL,
    "slug"            TEXT NOT NULL,
    "summary"         TEXT NOT NULL,
    "body"            TEXT NOT NULL,
    "coverImageUrl"   TEXT,
    "gallery"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "publishedAt"     TIMESTAMP(3),
    "startsAt"        TIMESTAMP(3),
    "endsAt"          TIMESTAMP(3),
    "location"        TEXT,
    "ctaLabel"        TEXT,
    "ctaUrl"          TEXT,
    "featured"        BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder"   INTEGER,
    "promoCode"       TEXT,
    "source"          TEXT,
    "notifyOnPublish" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");
CREATE INDEX "Post_category_status_publishedAt_idx" ON "Post"("category", "status", "publishedAt");
CREATE INDEX "Post_featured_featuredOrder_idx" ON "Post"("featured", "featuredOrder");
CREATE INDEX "Post_status_startsAt_idx" ON "Post"("status", "startsAt");
