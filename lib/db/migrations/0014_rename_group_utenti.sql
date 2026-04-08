-- Migration: rinomina il gruppo "Utenti" → "Gestione utenti" nella tabella permissions
-- Necessario dopo aver aggiornato system-permissions.ts
UPDATE "permissions"
SET "group" = 'Gestione utenti'
WHERE "group" = 'Utenti';
