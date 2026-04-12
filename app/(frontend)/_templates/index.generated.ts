// AUTO-GENERATO da scripts/generate-templates.ts
// NON modificare manualmente — viene sovrascritto a ogni build/dev.
// Per aggiungere un template: crea Template{Nome}.tsx in questa cartella.

import type { ComponentType } from "react";
import type { TemplateProps } from "./types";

import { TemplateArticolo } from "./TemplateArticolo";
import { TemplateBlog } from "./TemplateBlog";

export const GENERATED_TEMPLATE_MAP: Record<string, ComponentType<TemplateProps>> = {
  "articolo": TemplateArticolo,
  "blog": TemplateBlog,
};
