import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/db/pages-queries";
import { getTemplateById } from "@/lib/db/template-queries";
import { getLayoutComponent } from "@/app/(frontend)/_templates/registry";
import type { TemplateStyleConfig } from "@/lib/db/schema";

interface Props {
  params: Promise<{ slug: string[] }>;
}

function parseStyleConfig(raw: string | null | undefined): TemplateStyleConfig {
  try {
    return JSON.parse(raw ?? "{}");
  } catch {
    return {};
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const page = await getPageBySlug(fullSlug);
  if (!page) return {};
  return {
    title: page.title,
  };
}

export default async function FrontendPage({ params }: Props) {
  const { slug } = await params;
  const fullSlug = slug.join("/");

  const page = await getPageBySlug(fullSlug);
  if (!page) notFound();

  if (page.status !== "published") notFound();

  const template = page.templateId
    ? await getTemplateById(page.templateId)
    : null;

  // Usa lo slug del template come chiave nel registry.
  // Se nessun template è assegnato o lo slug non è registrato, cade su TemplateDefault.
  const templateSlug = template?.slug ?? "default";
  const LayoutComponent = getLayoutComponent(templateSlug);

  const styleConfig = parseStyleConfig(
    template?.styleConfig
  );

  let customFields: Record<string, unknown> = {};
  try {
    customFields = JSON.parse(page.customFields ?? "{}");
  } catch {
    // noop
  }

  const isPreview = false;

  return (
    <LayoutComponent
      page={{
        id: page.id,
        slug: page.slug,
        title: page.title,
        content: page.content,
        status: page.status,
        publishedAt: page.publishedAt?.toISOString() ?? null,
        customFields,
        templateFields: template?.fields ?? [],
      }}
      styleConfig={styleConfig}
      isPreview={isPreview}
    />
  );
}
