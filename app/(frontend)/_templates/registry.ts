/**
 * Registry dei layout base disponibili.
 * Ogni chiave corrisponde al valore di pageTemplates.layoutBase nel DB.
 * Per aggiungere un nuovo layout: creare il file TSX e registrarlo qui.
 */
import type { ComponentType } from "react";
import type { TemplateProps } from "./types";

// Import lazy per evitare bundle size inutile lato server
import { TemplateDefault } from "./TemplateDefault";
import { TemplateArticle } from "./TemplateArticle";
import { TemplateService } from "./TemplateService";
import { TemplateLanding } from "./TemplateLanding";
import { TemplateFaq } from "./TemplateFaq";

export const LAYOUT_BASES: Record<
  string,
  { label: string; description: string; component: ComponentType<TemplateProps> }
> = {
  default: {
    label: "Generico",
    description: "Layout semplice a colonna singola, adatto per pagine istituzionali",
    component: TemplateDefault,
  },
  article: {
    label: "Articolo",
    description: "Hero con immagine copertina, autore e contenuto ricco",
    component: TemplateArticle,
  },
  service: {
    label: "Servizio",
    description: "Header sezione + colonna principale + sidebar destra con CTA",
    component: TemplateService,
  },
  landing: {
    label: "Landing Page",
    description: "Full-width senza header/footer standard, ottimizzato per conversione",
    component: TemplateLanding,
  },
  faq: {
    label: "FAQ",
    description: "Accordion auto-generato dalle domande/risposte nel contenuto",
    component: TemplateFaq,
  },
};

export type LayoutBaseKey = keyof typeof LAYOUT_BASES;

/** Recupera il componente per un layoutBase, con fallback su default */
export function getLayoutComponent(layoutBase: string): ComponentType<TemplateProps> {
  return LAYOUT_BASES[layoutBase]?.component ?? LAYOUT_BASES.default.component;
}
