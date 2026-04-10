-- Migration 0017: Template grafici + colonne extra su pages
-- Crea page_templates, template_fields e aggiunge le colonne
-- mancanti sulla tabella pages (parent_id, template_id, custom_fields,
-- page_type, sort_order, expires_at).

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_templates" (
  "id"           serial PRIMARY KEY,
  "name"         varchar(100) NOT NULL,
  "slug"         varchar(100) NOT NULL UNIQUE,
  "description"  text,
  "layout_base"  varchar(50)  NOT NULL DEFAULT 'default',
  "style_config" text         DEFAULT '{}',
  "thumbnail"    text,
  "is_system"    boolean      NOT NULL DEFAULT false,
  "created_at"   timestamp    NOT NULL DEFAULT now(),
  "updated_at"   timestamp    NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "template_fields" (
  "id"            serial PRIMARY KEY,
  "template_id"   integer NOT NULL REFERENCES "page_templates"("id") ON DELETE CASCADE,
  "field_key"     varchar(100) NOT NULL,
  "field_type"    varchar(50)  NOT NULL DEFAULT 'text',
  "label"         varchar(150) NOT NULL,
  "placeholder"   varchar(255),
  "required"      boolean      NOT NULL DEFAULT false,
  "default_value" text,
  "options"       text         DEFAULT '{}',
  "sort_order"    integer      NOT NULL DEFAULT 0
);

--> statement-breakpoint
ALTER TABLE "pages"
  ADD COLUMN IF NOT EXISTS "expires_at"    timestamp,
  ADD COLUMN IF NOT EXISTS "parent_id"     integer,
  ADD COLUMN IF NOT EXISTS "template_id"   integer REFERENCES "page_templates"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "custom_fields" text    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "page_type"     varchar(50) NOT NULL DEFAULT 'page',
  ADD COLUMN IF NOT EXISTS "sort_order"    integer NOT NULL DEFAULT 0;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_template_fields_template ON "template_fields"("template_id");
CREATE INDEX IF NOT EXISTS idx_pages_parent             ON "pages"("parent_id");
CREATE INDEX IF NOT EXISTS idx_pages_template           ON "pages"("template_id");
