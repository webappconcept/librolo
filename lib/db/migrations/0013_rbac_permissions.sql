-- Migration 0013: RBAC — permissions, role_permissions, user_permissions
-- Aggiunge anche level e is_default alla tabella roles

-- Nuove colonne su roles
ALTER TABLE "roles"
  ADD COLUMN IF NOT EXISTS "level" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;

-- Catalogo permessi
CREATE TABLE IF NOT EXISTS "permissions" (
  "id"          serial PRIMARY KEY,
  "key"         varchar(100) NOT NULL UNIQUE,
  "label"       varchar(150) NOT NULL,
  "description" text,
  "group"       varchar(100) NOT NULL DEFAULT 'Generale',
  "is_system"   boolean NOT NULL DEFAULT false,
  "created_at"  timestamp NOT NULL DEFAULT now()
);

-- Matrice ruolo → permesso
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id"       integer NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "permission_id" integer NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("role_id", "permission_id")
);

-- Override individuali per utente
CREATE TABLE IF NOT EXISTS "user_permissions" (
  "id"            serial PRIMARY KEY,
  "user_id"       integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "permission_id" integer NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  "granted"       boolean NOT NULL DEFAULT true,
  "granted_by"    integer REFERENCES "users"("id"),
  "reason"        text,
  "expires_at"    timestamp,
  "created_at"    timestamp NOT NULL DEFAULT now()
);

-- Indici utili
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON "role_permissions"("role_id");
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON "user_permissions"("user_id");
CREATE INDEX IF NOT EXISTS idx_user_permissions_expires ON "user_permissions"("expires_at") WHERE "expires_at" IS NOT NULL;
