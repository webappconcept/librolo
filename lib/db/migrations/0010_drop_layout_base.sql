-- Migration: rimuovi colonna layout_base da page_templates
-- Sostituita dalla mappatura diretta slug → componente React nel registry frontend

ALTER TABLE page_templates DROP COLUMN IF EXISTS layout_base;
