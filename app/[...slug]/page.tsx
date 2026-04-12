// app/[...slug]/page.tsx
// Routing pubblico CMS — Opzione B: auto-import dinamico del template
// Convenzione: template slug "articolo-blog" → file templates/ArticoloBlogTemplate.tsx
// Se il file non esiste, cade su DefaultTemplate senza errori.

import { getPageBySlug } from "@/lib/db/pages-queries";
import { getTemplateById } from "@/lib/db/template-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import { resolvePlaceholders } from "@/lib/utils/content-placeholders";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Page, PageTemplate } from "@/lib/db/schema";
import DefaultTemplate from "./templates/DefaultTemplate";

export const dynamic = "force-dynamic";

export type CmsTemplateProps = {
  page: Page;
  template: PageTemplate | null;
  resolvedContent: string;
  settings: Record<string, string | null | undefined> | null;
};

interface Props {
  params: Promise<{ slug: string[] }>;
}

/** "articolo-blog" → "ArticoloBlog" */
function toPascalCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function isPubliclyVisible(page: Page | null | undefined): page is Page {
  if (!page || page.status !== "published") return false;
  if (page.expiresAt && new Date(page.expiresAt) <= new Date()) return false;
  return true;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const [page, seo] = await Promise.all([
    getPageBySlug(fullSlug),
    getSeoPage(`/${fullSlug}`),
  ]);

  if (!isPubliclyVisible(page)) return {};

  return {
    title: seo?.title ?? page.title,
    description: seo?.description ?? undefined,
    robots: seo?.robots ?? undefined,
    openGraph: {
      title: seo?.ogTitle ?? seo?.title ?? page.title,
      description: seo?.ogDescription ?? seo?.description ?? undefined,
      images: seo?.ogImage ? [seo.ogImage] : undefined,
    },
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const fullSlug = slug.join("/");

  const [page, settings] = await Promise.all([
    getPageBySlug(fullSlug),
    getAppSettings(),
  ]);

  if (!isPubliclyVisible(page)) notFound();

  const template = page.templateId
    ? await getTemplateById(page.templateId)
    : null;

  // Risolvi i placeholder nel contenuto (es. {{app_name}})
  const resolvedContent = resolvePlaceholders(page.content, settings);

  // --- Auto-routing Opzione B ---
  // Prova a importare templates/{PascalCase}Template.tsx
  // Se il file non esiste → usa DefaultTemplate
  let TemplateComponent: React.ComponentType<CmsTemplateProps> = DefaultTemplate;

  if (template?.slug) {
    const componentName = toPascalCase(template.slug);
    try {
      const mod = await import(`./templates/${componentName}Template`);
      if (mod.default) TemplateComponent = mod.default;
    } catch {
      // File non trovato o errore di import — cade su DefaultTemplate
      TemplateComponent = DefaultTemplate;
    }
  }

  return (
    <TemplateComponent
      page={page}
      template={template ?? null}
      resolvedContent={resolvedContent}
      settings={settings as CmsTemplateProps["settings"]}
    />
  );
}
