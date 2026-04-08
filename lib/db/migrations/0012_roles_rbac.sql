-- 0012_roles_rbac.sql
-- Tabella ruoli configurabili
CREATE TABLE IF NOT EXISTS "roles" (
  "id" serial PRIMARY KEY,
  "name" varchar(50) NOT NULL UNIQUE,
  "label" varchar(100) NOT NULL,
  "color" varchar(20) NOT NULL DEFAULT '#6b7280',
  "description" text,
  "is_admin" boolean NOT NULL DEFAULT false,
  "is_staff" boolean NOT NULL DEFAULT false,
  "is_system" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Colonne guard sulla tabella users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_staff" boolean NOT NULL DEFAULT false;

-- Seed ruoli di sistema (non eliminabili)
INSERT INTO "roles" ("name", "label", "color", "description", "is_admin", "is_staff", "is_system", "sort_order")
VALUES
  ('member',  'Membro',    '#6b7280', 'Utente standard senza privilegi speciali.',             false, false, true, 0),
  ('editor',  'Editore',   '#2563eb', 'Può gestire i contenuti ma non gli utenti.',            false, true,  true, 1),
  ('support', 'Supporto',  '#16a34a', 'Può visualizzare utenti e ticket di assistenza.',       false, true,  true, 2),
  ('admin',   'Admin',     '#7c3aed', 'Accesso completo al pannello di amministrazione.',      true,  true,  true, 3)
ON CONFLICT ("name") DO NOTHING;

-- Sincronizza is_admin/is_staff per gli utenti esistenti in base al loro role corrente
UPDATE "users" u
SET
  "is_admin" = r.is_admin,
  "is_staff"  = r.is_staff
FROM "roles" r
WHERE r."name" = u."role";
