/**
 * DEPRECATO — non aggiungere nuove voci qui.
 *
 * Per aggiungere un nuovo template:
 *   1. Crea il file TSX: Template{NomePascalCase}.tsx in questa cartella
 *   2. Aggiungi UNA riga in loader.tsx → TEMPLATE_LAZY_MAP
 *   3. Lo slug viene derivato automaticamente — niente chiavi manuali
 *
 * Vedi: app/(frontend)/_templates/loader.tsx
 */
import type { ComponentType } from "react";
import type { TemplateProps } from "./types";
import { TemplateDefault } from "./TemplateDefault";
import { getDynamicTemplate } from "./loader";

/** @deprecated Usa getDynamicTemplate() da loader.tsx */
export function getLayoutComponent(
  templateSlug: string
): ComponentType<TemplateProps> {
  return getDynamicTemplate(templateSlug) ?? TemplateDefault;
}
