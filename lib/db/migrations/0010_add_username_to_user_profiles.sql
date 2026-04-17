-- Migration: aggiunge il campo username alla tabella user_profiles
-- Eseguire con: npx drizzle-kit push  oppure applicare manualmente su Supabase

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "username" varchar(50) UNIQUE;
