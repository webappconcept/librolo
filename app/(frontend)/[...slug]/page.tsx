import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/db/pages-queries";
import { getTemplateById } from "@/lib/db/template-queries";
import { getSeoPageByPathname } from "@/lib/db/seo-queries";
import { getLayoutComponent } from "@/app/(frontend)/_templates/registry";
import type { TemplateProps } from "@/app/(frontend)/_templates/types";
import type { Metadata } from "next";

interface PageParams {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const seo = await getSeoPageByPathname(`/${fullSlug}`);
  const page = await getPageBySlug(fullSlug);

  const title = seo?.title ?? page?.title ?? fullSlug;
  const description = seo?.description ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title: seo?.ogTitle ?? title,
      description: seo?.ogDescription ?? description,
      images: seo?.ogImage ? [seo.ogImage] : [],
    },
    robots: seo?.robots ?? undefined,
  };
}

export default async function FrontendPage({ params }: PageParams) {
  const { slug } = await params;
  const fullSlug = slug.join("/");

  const page = await getPageBySlug(fullSlug);

  // Pagina non trovata o non pubblicata
  if (!page || page.status !== "published") notFound();

  // Carica template se assegnato
  let template = null;
  if (page.templateId) {
    template = await getTemplateById(page.templateId);
  }

  // Recupera meta SEO
  const seo = await getSeoPageByPathname(`/${fullSlug}`);

  // Deserializza customFields
  let customFields: Record<string, string> = {};
  try {
    customFields = JSON.parse(page.customFields ?? "{}");
  } catch { /* noop */ }

  // Deserializza styleConfig del template
  let styleConfig: Record<string, string> = {};
  if (template) {
    try {
      styleConfig = JSON.parse(template.styleConfig ?? "{}");
    } catch { /* noop */ }
  }

  const layoutBase = template?.layoutBase ?? "default";
  const TemplateComponent = getLayoutComponent(layoutBase);

  const props: TemplateProps = {
    page: {
      id: page.id,
      slug: page.slug,
      title: page.title,
      content: page.content,
      status: page.status,
      pageType: page.pageType,
      customFields,
      publishedAt: page.publishedAt ? page.publishedAt.toISOString() : null,
    },
    template: template
      ? {
          id: template.id,
          name: template.name,
          slug: template.slug,
          layoutBase: template.layoutBase,
          styleConfig,
          fields: template.fields,
        }
      : null,
    seo: seo
      ? {
          title: seo.title ?? null,
          description: seo.description ?? null,
          ogTitle: seo.ogTitle ?? null,
          ogImage: seo.ogImage ?? null,
        }
      : null,
  };

  return <TemplateComponent {...props} />;
}
