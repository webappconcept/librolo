/**
 * DEPRECATO — non aggiungere nuove voci qui.
 *
 * Il sistema ora usa il dynamic loader basato su convenzione del nome file.
 * Vedi: app/(frontend)/_templates/loader.tsx
 *
 * Come aggiungere un nuovo template:
 *   1. Crea il file TSX: Template{PascalCase(slug)}.tsx in questa cartella
 *      Es. slug "articolo-blog" → TemplateArticoloBlog.tsx
 *   2. Nessun registry da aggiornare — il loader lo trova automaticamente.
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
