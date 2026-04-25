-- Migration 0018: tabella oauth_accounts per social login (Google, futuri provider)
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
  "id"                  serial PRIMARY KEY,
  "user_id"             uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider"            varchar(32) NOT NULL,
  "provider_account_id" varchar(255) NOT NULL,
  "access_token"        text,
  "refresh_token"       text,
  "expires_at"          timestamp,
  "scope"               varchar(500),
  "created_at"          timestamp NOT NULL DEFAULT now(),
  "updated_at"          timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "uq_oauth_provider_account" UNIQUE ("provider", "provider_account_id")
);

CREATE INDEX IF NOT EXISTS "idx_oauth_accounts_user_id" ON "oauth_accounts"("user_id");
