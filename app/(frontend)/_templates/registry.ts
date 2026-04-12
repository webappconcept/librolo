/**
 * Registry dei template frontend.
 *
 * La chiave è il `slug` del template in DB (es. "articolo", "faq").
 * Il developer crea qui la mappatura slug → componente React.
 *
 * Per aggiungere un nuovo template:
 *   1. Crea il file TSX in questa cartella (es. TemplateArticolo.tsx)
 *   2. Registralo qui con la chiave uguale allo slug scelto in admin
 *
 * Se uno slug non è registrato, viene usato TemplateDefault come fallback.
 */
import type { ComponentType } from "react";
import type { TemplateProps } from "./types";

import { TemplateDefault } from "./TemplateDefault";
import { TemplateArticle } from "./TemplateArticle";
import { TemplateService } from "./TemplateService";
import { TemplateLanding } from "./TemplateLanding";
import { TemplateFaq } from "./TemplateFaq";

export const TEMPLATE_REGISTRY: Record<
  string,
  ComponentType<TemplateProps>
> = {
  // slug "default" → usato come fallback generico
  default: TemplateDefault,

  // Slug italiani (usati nel CMS admin)
  articolo: TemplateArticle,
  servizio: TemplateService,
  landing: TemplateLanding,
  faq: TemplateFaq,

  // Alias slug inglesi (retrocompatibilità)
  article: TemplateArticle,
  service: TemplateService,
};

/**
 * Restituisce il componente React per il dato slug del template.
 * Se lo slug non è nel registry, cade su TemplateDefault.
 */
export function getLayoutComponent(templateSlug: string): ComponentType<TemplateProps> {
  return TEMPLATE_REGISTRY[templateSlug] ?? TemplateDefault;
}
