/**
 * Template loader.
 *
 * Usa la mappa auto-generata da scripts/generate-templates.ts.
 * Non modificare questa mappa manualmente: viene sovrascritta
 * a ogni `pnpm dev` / `pnpm build`.
 *
 * Per aggiungere un template:
 *   1. Crea Template{NomePascalCase}.tsx in questa cartella
 *   2. Esegui `pnpm dev` o `pnpm build` (rigenera automaticamente)
 *   3. Fine — nessun altro file da toccare.
 */
import type { ComponentType } from "react";
import type { TemplateProps } from "./types";
import { TemplateDefault } from "./TemplateDefault";
// Questo file viene generato automaticamente prima del build.
// Se non esiste ancora, esegui: pnpm run generate:templates
import { GENERATED_TEMPLATE_MAP } from "./index.generated";

export function getDynamicTemplate(
  templateSlug: string
): ComponentType<TemplateProps> {
  if (!templateSlug || templateSlug === "default") {
    return TemplateDefault;
  }
  return GENERATED_TEMPLATE_MAP[templateSlug] ?? TemplateDefault;
}
