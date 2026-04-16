-- Migration: 0009_otp_attempts
-- Aggiunge il contatore di tentativi falliti alla tabella email_verifications.
-- Colonna NOT NULL con default 0: nessun dato esistente viene invalidato.

ALTER TABLE "email_verifications"
  ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0;
