-- Migration 0019: avatar_url su user_profiles + chiavi Google in app_settings

-- 1. Aggiungi colonna avatar_url a user_profiles
ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "avatar_url" text;

-- 2. Inserisci chiavi Google in app_settings (valore NULL di default,
--    configurabili dall'admin senza fare un nuovo deploy)
INSERT INTO "app_settings" ("key", "value", "updated_at")
VALUES
  ('google_client_id',     NULL, NOW()),
  ('google_client_secret', NULL, NOW()),
  ('google_redirect_uri',  NULL, NOW())
ON CONFLICT ("key") DO NOTHING;
