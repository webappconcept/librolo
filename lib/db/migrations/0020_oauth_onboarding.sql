-- Migration 0020: supporto OAuth-only users + flow di onboarding
--
-- Cambia:
--   1. users.password_hash → nullable (gli utenti OAuth non hanno password)
--   2. users.onboarding_completed_at (timestamp) — null = onboarding non fatto
--   3. user_profiles.interests (text[]) — interessi crypto scelti durante l'onboarding

-- 1. Rendi password_hash nullable
ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL;

-- 2. Aggiungi onboarding_completed_at
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;

-- 3. Aggiungi interests come array di stringhe (default array vuoto)
ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "interests" text[] NOT NULL DEFAULT '{}'::text[];
