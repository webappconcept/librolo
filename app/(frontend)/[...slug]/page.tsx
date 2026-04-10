import { getPageBySlug } from "@/lib/db/pages-queries";
import { getTemplateById } from "@/lib/db/template-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import { getLayoutComponent } from "@/app/(frontend)/_templates/registry";
import type { TemplateProps } from "@/app/(frontend)/_templates/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseStyleConfig, parseCustomFields } from "@/app/(frontend)/_templates/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string[] }>;
};

/** Ricostruisce lo slug completo dall'array dei segmenti */
function buildPathname(slugSegments: string[]): string {
  return "/" + slugSegments.join("/");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pathname = buildPathname(slug);
  const seo = await getSeoPage(pathname);

  if (!seo) return {};

  return {
    title: seo.title ?? undefined,
    description: seo.description ?? undefined,
    openGraph: {
      title: seo.ogTitle ?? seo.title ?? undefined,
      description: seo.ogDescription ?? seo.description ?? undefined,
      images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
    },
    robots: seo.robots ?? undefined,
  };
}

export default async function FrontendPage({ params }: Props) {
  const { slug } = await params;
  const slugString = slug.join("/");
  const pathname = buildPathname(slug);

  const page = await getPageBySlug(slugString);
  if (!page) notFound();

  // Carica il template se presente
  const template = page.templateId
    ? await getTemplateById(page.templateId)
    : null;

  const layoutBase = template?.layoutBase ?? "default";
  const LayoutComponent = getLayoutComponent(layoutBase);

  const styleConfig = parseStyleConfig(
    template?.styleConfig ? JSON.stringify(template.styleConfig) : null
  );
  const fields = parseCustomFields(
    page.customFields ? JSON.stringify(page.customFields) : null
  );

  const props: TemplateProps = {
    page,
    template: template
      ? { ...template, fields: template.fields ?? [] }
      : null,
    fields,
    styleConfig,
    isPreview: false,
  };

  return <LayoutComponent {...props} />;
}
