import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/db/pages-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { getTemplateById } from "@/lib/db/template-queries";
import { getLayoutComponent } from "@/app/(frontend)/_templates/registry";
import { parseStyleConfig, parseCustomFields } from "@/app/(frontend)/_templates/types";

interface Props {
  params: Promise<{ slug: string[] }>;
}

/** Risolve i placeholder {token} usando i valori delle settings */
function resolveMeta(value: string | null | undefined, appName: string, appDomain: string): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/\{appName\}/g, appName)
    .replace(/\{appDomain\}/g, appDomain)
    .replace(/\{currentYear\}/g, String(new Date().getFullYear()));
}

function isPubliclyVisible(page: Awaited<ReturnType<typeof getPageBySlug>>): page is NonNullable<typeof page> {
  if (!page || page.status !== "published") return false;
  if (page.expiresAt && new Date(page.expiresAt) <= new Date()) return false;
  return true;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fullSlug = slug.join("/");

  const [page, seo, settings] = await Promise.all([
    getPageBySlug(fullSlug),
    getSeoPage(`/${fullSlug}`),
    getAppSettings(),
  ]);

  if (!isPubliclyVisible(page)) return {};

  const appName = settings.app_name ?? "";
  const appDomain = settings.app_domain ?? "";

  const metaTitle = resolveMeta(seo?.title, appName, appDomain) ?? page.title;
  const metaDesc = resolveMeta(seo?.description, appName, appDomain);
  const ogTitle = resolveMeta(seo?.ogTitle ?? seo?.title, appName, appDomain) ?? page.title;
  const ogDesc = resolveMeta(seo?.ogDescription ?? seo?.description, appName, appDomain);

  return {
    title: metaTitle,
    description: metaDesc,
    robots: seo?.robots ?? undefined,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      images: seo?.ogImage ? [seo.ogImage] : undefined,
    },
  };
}

export default async function FrontendPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug.join("/"));

  if (!isPubliclyVisible(page)) notFound();

  const template = page.templateId
    ? await getTemplateById(page.templateId)
    : null;

  const templateSlug = template?.slug ?? "default";
  const LayoutComponent = getLayoutComponent(templateSlug);

  const styleConfig = parseStyleConfig(template?.styleConfig);
  const fields = parseCustomFields(page.customFields);

  return (
    <LayoutComponent
      page={page}
      template={template ?? null}
      fields={fields}
      styleConfig={styleConfig}
      isPreview={false}
    />
  );
}
