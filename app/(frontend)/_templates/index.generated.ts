// AUTO-GENERATO da scripts/generate-templates.ts
// NON modificare manualmente — viene sovrascritto a ogni build/dev.
// Per aggiungere un template: crea Template{Nome}.tsx in questa cartella.

import type { ComponentType } from "react";
import type { TemplateProps } from "./types";

import { TemplateArticle } from "./TemplateArticolo";
import { TemplateFaq } from "./TemplateFaq";
import { TemplateLanding } from "./TemplateLanding";
import { TemplateService } from "./TemplateService";

export const GENERATED_TEMPLATE_MAP: Record<
  string,
  ComponentType<TemplateProps>
> = {
  article: TemplateArticle,
  service: TemplateService,
  landing: TemplateLanding,
  faq: TemplateFaq,
};
