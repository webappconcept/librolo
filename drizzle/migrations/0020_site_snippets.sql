-- Migration: crea tabella site_snippets
CREATE TABLE IF NOT EXISTS "site_snippets" (
  "id"          serial PRIMARY KEY,
  "name"        varchar(150)  NOT NULL,
  "type"        varchar(20)   NOT NULL DEFAULT 'script',
  "position"    varchar(20)   NOT NULL DEFAULT 'head',
  "content"     text          NOT NULL DEFAULT '',
  "is_active"   boolean       NOT NULL DEFAULT true,
  "sort_order"  integer       NOT NULL DEFAULT 0,
  "created_at"  timestamp     NOT NULL DEFAULT now(),
  "updated_at"  timestamp     NOT NULL DEFAULT now()
);
