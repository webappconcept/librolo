import type { Page, PageTemplate, TemplateField } from "@/lib/db/schema";

export interface TemplateStyleConfig {
  fontBody?: string;
  fontDisplay?: string;
  colorPrimary?: string;
  colorBg?: string;
  colorText?: string;
  spacing?: "compact" | "normal" | "spacious";
  borderRadius?: "none" | "small" | "medium" | "large";
}

export interface TemplateProps {
  page: Page;
  template: (PageTemplate & { fields: TemplateField[] }) | null;
  /** Valori dei campi custom: { fieldKey: value } */
  fields: Record<string, string>;
  styleConfig: TemplateStyleConfig;
}

/** Helper: parsa styleConfig in modo sicuro */
export function parseStyleConfig(raw: string | null | undefined): TemplateStyleConfig {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as TemplateStyleConfig;
  } catch {
    return {};
  }
}

/** Helper: parsa customFields in modo sicuro */
export function parseCustomFields(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Calcola le CSS variables di stile da un TemplateStyleConfig */
export function styleConfigToCssVars(config: TemplateStyleConfig): React.CSSProperties {
  const vars: Record<string, string> = {};
  if (config.colorPrimary) vars["--tpl-primary"] = config.colorPrimary;
  if (config.colorBg) vars["--tpl-bg"] = config.colorBg;
  if (config.colorText) vars["--tpl-text"] = config.colorText;
  if (config.fontBody) vars["--tpl-font-body"] = config.fontBody;
  if (config.fontDisplay) vars["--tpl-font-display"] = config.fontDisplay;
  // spacing e borderRadius vengono gestiti tramite classi CSS
  return vars as React.CSSProperties;
}
