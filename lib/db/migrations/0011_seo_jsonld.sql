ALTER TABLE "seo_pages" ADD COLUMN IF NOT EXISTS "json_ld_enabled" boolean DEFAULT false;
ALTER TABLE "seo_pages" ADD COLUMN IF NOT EXISTS "json_ld_type" varchar(50);
