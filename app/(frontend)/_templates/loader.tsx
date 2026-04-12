/**
 * Template loader — alternativa al registry manuale.
 *
 * PERCHÉ non usiamo dynamic import con template literal:
 * Turbopack e webpack richiedono che il path dell'import() sia
 * staticamente inferibile a compile time. Un path completamente
 * dinamico come `import(\`./_templates/Template${name}\`)` causa
 * build error "Module not found: Can't resolve '<dynamic>'".
 *
 * SOLUZIONE: lazy-map statico.
 * - Ogni Template*.tsx ha un import statico con React.lazy()
 * - La chiave della mappa è lo slug derivato dal nome del file
 * - getDynamicTemplate() risolve slug → componente a runtime
 * - Per aggiungere un template: crea il file TSX e aggiungi
 *   UNA riga in TEMPLATE_LAZY_MAP (solo il lazy(), niente slug manuale)
 */
import { lazy, type ComponentType } from "react";
import type { TemplateProps } from "./types";
import { TemplateDefault } from "./TemplateDefault";
import { slugify } from "@/lib/utils/slugify";

/**
 * Converte il nome PascalCase del componente nello slug corrispondente.
 * "ArticoloBlog" → "articolo-blog"
 * "Faq"          → "faq"
 */
function pascalToSlug(pascal: string): string {
  return slugify(
    pascal.replace(/([A-Z])/g, " $1").trim()
  );
}

/**
 * Mappa lazy dei template disponibili.
 * UNICO posto da aggiornare quando si aggiunge un nuovo template:
 * aggiungi una riga   NomeComponente: lazy(() => import("./TemplateNome"))
 * Lo slug viene derivato automaticamente dal nome della chiave.
 */
const TEMPLATE_LAZY_MAP: Record<string, ReturnType<typeof lazy<ComponentType<TemplateProps>>>> = {
  Article:  lazy(() => import("./TemplateArticle").then(m => ({ default: m.TemplateArticle }))),
  Service:  lazy(() => import("./TemplateService").then(m => ({ default: m.TemplateService }))),
  Landing:  lazy(() => import("./TemplateLanding").then(m => ({ default: m.TemplateLanding }))),
  Faq:      lazy(() => import("./TemplateFaq").then(m => ({ default: m.TemplateFaq }))),
  // ↑ Aggiungi qui nuovi template. Lo slug viene derivato dal nome della chiave:
  // "ArticoloBlog": lazy(...) → slug "articolo-blog"
};

/**
 * Mappa slug → componente, costruita una volta al modulo load.
 * Es: { "article": LazyArticle, "service": LazyService, ... }
 */
const SLUG_MAP: Record<string, ComponentType<TemplateProps>> = Object.fromEntries(
  Object.entries(TEMPLATE_LAZY_MAP).map(([pascalName, component]) => [
    pascalToSlug(pascalName),
    component,
  ])
);

/**
 * Restituisce il componente React per il dato slug del template.
 * Alias inglesi mantenuti per retrocompatibilità con slug già in DB.
 * Se lo slug non è trovato → fallback su TemplateDefault.
 */
export function getDynamicTemplate(
  templateSlug: string
): ComponentType<TemplateProps> {
  if (!templateSlug || templateSlug === "default") {
    return TemplateDefault;
  }
  return SLUG_MAP[templateSlug] ?? TemplateDefault;
}
