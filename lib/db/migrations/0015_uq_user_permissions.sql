-- Migration: 0015_uq_user_permissions
-- Obiettivo: eliminare duplicati esistenti, aggiungere colonna updated_at
-- e vincolo UNIQUE su (user_id, permission_id) in user_permissions.

-- 1. Aggiunge colonna updated_at se non esiste già
ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

-- 2. Rimuove righe duplicate mantenendo quella con created_at più recente.
--    Necessario PRIMA di creare l'indice univoco, altrimenti fallisce.
DELETE FROM user_permissions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, permission_id) id
  FROM user_permissions
  ORDER BY user_id, permission_id, created_at DESC
);

-- 3. Crea l'indice univoco (garantisce che non si creino mai duplicati futuri)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_permissions_user_perm
  ON user_permissions (user_id, permission_id);
