// app/[...slug]/page.tsx
// Routing pubblico CMS — mappa statica dei template con dynamic import.
// Per aggiungere un nuovo template: registralo in ./templates/index.ts

import { getPageBySlug } from "@/lib/db/pages-queries";
import { getTemplateById } from "@/lib/db/template-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import { resolvePlaceholders } from "@/lib/utils/content-placeholders";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Page, PageTemplate } from "@/lib/db/schema";
import DefaultTemplate from "./templates/DefaultTemplate";
import templateMap from "./templates/index";

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

  // --- Selezione template con mappa statica ---
  // Il bundler analizza staticamente templateMap → i file vengono inclusi nel bundle.
  // Con stringhe interpolate (import(`./templates/${name}`)) il bundler
  // non può risolvere i path e li esclude dal bundle in produzione.
  let TemplateComponent: React.ComponentType<CmsTemplateProps> = DefaultTemplate;

  if (template?.slug && templateMap[template.slug]) {
    try {
      const mod = await templateMap[template.slug]();
      if (mod.default) TemplateComponent = mod.default;
    } catch {
      // Errore imprevisto nell'import — cade su DefaultTemplate
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
