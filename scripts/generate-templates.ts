#!/usr/bin/env tsx
/**
 * scripts/generate-templates.ts
 *
 * Scansiona app/(frontend)/_templates/Template*.tsx e genera
 * app/(frontend)/_templates/index.generated.ts con:
 *   - import statici (richiesti da Turbopack/webpack)
 *   - mappa slug → componente derivata dal nome file
 *
 * Eseguito automaticamente da prebuild e predev.
 * Il file generato NON va committato (.gitignore).
 */

import { readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "../app/(frontend)/_templates");
const OUTPUT_FILE = join(TEMPLATES_DIR, "index.generated.ts");

/** TemplateArticoloBlog → articolo-blog */
function componentNameToSlug(name: string): string {
  return name
    .replace(/^Template/, "")
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}

// Trova tutti i file Template*.tsx escludendo TemplateDefault
const files = readdirSync(TEMPLATES_DIR)
  .filter(
    (f) =>
      f.startsWith("Template") &&
      f.endsWith(".tsx") &&
      f !== "TemplateDefault.tsx"
  )
  .sort();

if (files.length === 0) {
  console.log("[generate-templates] Nessun template trovato oltre a TemplateDefault.");
}

// Costruisce le righe del file generato
const componentNames = files.map((f) => f.replace(".tsx", ""));

const importLines = componentNames
  .map((name) => `import { ${name} } from "./${name}";`)
  .join("\n");

const mapEntries = componentNames
  .map((name) => {
    const slug = componentNameToSlug(name);
    return `  "${slug}": ${name},`;
  })
  .join("\n");

const output = `// AUTO-GENERATO da scripts/generate-templates.ts
// NON modificare manualmente — viene sovrascritto a ogni build/dev.
// Per aggiungere un template: crea Template{Nome}.tsx in questa cartella.

import type { ComponentType } from "react";
import type { TemplateProps } from "./types";

${importLines}

export const GENERATED_TEMPLATE_MAP: Record<string, ComponentType<TemplateProps>> = {
${mapEntries}
};
`;

writeFileSync(OUTPUT_FILE, output, "utf-8");
console.log(
  `[generate-templates] Generati ${files.length} template:\n` +
  componentNames.map((n) => `  ${n} → slug: ${componentNameToSlug(n)}`).join("\n")
);
