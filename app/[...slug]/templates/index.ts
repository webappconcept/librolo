// app/[...slug]/templates/index.ts
// Mappa statica slug → import dinamico del template.
// Il bundler (Webpack/Turbopack) richiede path STATICI nei dynamic import:
// stringhe interpolate come `./templates/${name}` vengono ignorate in produzione.
//
// ✅ Come aggiungere un nuovo template:
//   1. Crea il file  templates/MioNomeTemplate.tsx
//   2. Aggiungi qui: "mio-nome": () => import("./MioNomeTemplate")
//   Lo slug deve corrispondere ESATTAMENTE al campo `slug` del template nel DB.

import type { ComponentType } from "react";
import type { CmsTemplateProps } from "../page";

type TemplateImport = () => Promise<{ default: ComponentType<CmsTemplateProps> }>;

const templateMap: Record<string, TemplateImport> = {
  // --- Aggiungi i tuoi template qui sotto ---
  articolo: () => import("./ArticoloTemplate"),
  // "articolo-blog": () => import("./ArticoloBlogTemplate"),
  // "landing": () => import("./LandingTemplate"),
};

export default templateMap;
