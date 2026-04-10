-- Migration 0016: Tabella pages — CMS pagine statiche
-- Gestisce slug, titolo e contenuto delle pagine pubbliche.
-- I meta SEO rimangono separati in seo_pages, collegati tramite pathname.

CREATE TABLE IF NOT EXISTS "pages" (
  "id"           serial PRIMARY KEY,
  "slug"         varchar(255) NOT NULL UNIQUE,
  "title"        varchar(255) NOT NULL,
  "content"      text NOT NULL DEFAULT '',
  "status"       varchar(20)  NOT NULL DEFAULT 'draft',
  "published_at" timestamp,
  "created_at"   timestamp    NOT NULL DEFAULT now(),
  "updated_at"   timestamp    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pages_slug   ON "pages"("slug");
CREATE INDEX IF NOT EXISTS idx_pages_status ON "pages"("status");
