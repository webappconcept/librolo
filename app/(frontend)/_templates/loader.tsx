import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { TemplateProps } from "./types";
import { TemplateDefault } from "./TemplateDefault";
import { slugToPascalCase } from "@/lib/utils/slugify";

/**
 * Carica dinamicamente il template TSX in base allo slug del DB.
 * Convenzione: slug "articolo-blog" → file "TemplateArticoloBlog.tsx"
 * Se il file non esiste su disco → fallback silenzioso su TemplateDefault.
 */
export function getDynamicTemplate(
  templateSlug: string
): ComponentType<TemplateProps> {
  if (!templateSlug || templateSlug === "default") {
    return TemplateDefault;
  }

  const componentName = slugToPascalCase(templateSlug);

  return dynamic<TemplateProps>(
    () =>
      import(`./_templates/Template${componentName}`).catch(() => ({
        default: TemplateDefault as ComponentType<TemplateProps>,
      })),
    {
      loading: () => null,
      ssr: true,
    }
  ) as ComponentType<TemplateProps>;
}
