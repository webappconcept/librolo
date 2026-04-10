-- Aggiunge il campo expires_at alla tabella pages
-- Esegui questo script sul database prima del deploy
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
