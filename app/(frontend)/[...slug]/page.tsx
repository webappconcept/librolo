import { getPageWithTemplate } from "@/lib/db/pages-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import { getDynamicTemplate } from "@/app/(frontend)/_templates/loader";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// ---------------------------------------------------------------------------
// generateMetadata — legge seo_pages per il pathname corrente.
// Fallback: title della pagina CMS.
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pathname = "/" + slug.join("/");

  const [seo, page] = await Promise.all([
    getSeoPage(pathname),
    getPageWithTemplate(slug.join("/")),
  ]);

  const title = seo?.title || page?.title || undefined;
  const description = seo?.description || undefined;

  return {
    title,
    description,
    openGraph: {
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      ...(seo?.ogImage ? { images: [{ url: seo.ogImage }] } : {}),
    },
    robots: seo?.robots || undefined,
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function FrontendPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const pageSlug = slug.join("/");

  const pageData = await getPageWithTemplate(pageSlug);

  if (!pageData || pageData.status !== "published") {
    notFound();
  }

  const templateSlug = pageData.template?.slug ?? null;
  const TemplateComponent = await getDynamicTemplate(templateSlug);

  return (
    <TemplateComponent
      page={pageData}
      template={pageData.template ?? null}
    />
  );
}
