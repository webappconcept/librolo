import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/db/pages-queries";
import { getTemplateById } from "@/lib/db/template-queries";
import { getLayoutComponent } from "@/app/(frontend)/_templates/registry";
import { parseStyleConfig, parseCustomFields } from "@/app/(frontend)/_templates/types";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug.join("/"));
  if (!page) return {};
  return { title: page.title };
}

export default async function FrontendPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug.join("/"));

  if (!page) notFound();
  if (page.status !== "published") notFound();

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
