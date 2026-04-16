-- Migration: 0020_add_user_subscriptions_table.sql
-- Crea la tabella user_subscriptions (gia' presente nello schema Drizzle)
-- e migra i dati Stripe da users se le colonne legacy esistono ancora.
--
-- Esecuzione:
--   npx drizzle-kit migrate
--   oppure applicare manualmente su Supabase SQL Editor
--
-- Idempotente: IF NOT EXISTS / ON CONFLICT DO NOTHING

-- ============================================================
-- 1. Crea tabella user_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "stripe_customer_id"     VARCHAR(255),
  "stripe_subscription_id" VARCHAR(255),
  "stripe_product_id"      VARCHAR(255),
  "plan_name"              VARCHAR(100),
  "subscription_status"    VARCHAR(50),
  "created_at"             TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Migra dati da users (solo se le colonne Stripe esistono ancora)
-- ============================================================
DO $$
DECLARE
  cols_exist BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name  = 'users'
      AND column_name = 'stripe_customer_id'
  ) INTO cols_exist;

  IF cols_exist THEN
    INSERT INTO user_subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_product_id,
      plan_name,
      subscription_status,
      created_at,
      updated_at
    )
    SELECT
      id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_product_id,
      plan_name,
      subscription_status,
      COALESCE(updated_at, NOW()),
      NOW()
    FROM users
    WHERE stripe_customer_id IS NOT NULL
       OR stripe_subscription_id IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Dati Stripe migrati da users a user_subscriptions.';
  ELSE
    RAISE NOTICE 'Colonne Stripe non trovate in users — nessuna migrazione dati necessaria.';
  END IF;
END $$;

-- ============================================================
-- 3. DROP colonne Stripe da users
--    ATTENZIONE: eseguire SOLO dopo aver verificato i dati in user_subscriptions!
--    Decommentare quando pronti.
-- ============================================================
-- ALTER TABLE "users"
--   DROP COLUMN IF EXISTS "stripe_customer_id",
--   DROP COLUMN IF EXISTS "stripe_subscription_id",
--   DROP COLUMN IF EXISTS "stripe_product_id",
--   DROP COLUMN IF EXISTS "plan_name",
--   DROP COLUMN IF EXISTS "subscription_status";

-- ============================================================
-- 4. Index per lookup Stripe (performance webhook)
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_stripe_customer"
  ON "user_subscriptions" ("stripe_customer_id")
  WHERE "stripe_customer_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_status"
  ON "user_subscriptions" ("subscription_status")
  WHERE "subscription_status" IS NOT NULL;
