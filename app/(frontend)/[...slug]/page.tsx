import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageWithTemplate, getPublishedPages } from "@/lib/db/pages-queries";
import { getLayoutComponent } from "../_templates/registry";
import { parseStyleConfig, parseCustomFields } from "../_templates/types";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------
interface Props {
  params: Promise<{ slug: string[] }>;
}

// ---------------------------------------------------------------------------
// generateStaticParams — pre-genera tutte le pagine pubblicate in build
// ---------------------------------------------------------------------------
export async function generateStaticParams() {
  const published = await getPublishedPages();
  return published.map((p) => ({
    slug: p.slug.split("/").filter(Boolean),
  }));
}

// ---------------------------------------------------------------------------
// generateMetadata — SEO automatico dalla pagina
// ---------------------------------------------------------------------------
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const page = await getPageWithTemplate(slugPath);
  if (!page) return {};
  return {
    title: page.title,
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default async function FrontendPage({ params }: Props) {
  const { slug } = await params;
  const slugPath = slug.join("/");

  // Recupera pagina + template + campi dal DB
  const page = await getPageWithTemplate(slugPath);

  // 404 se non esiste o non è pubblicata
  if (!page || page.status !== "published") return notFound();

  // Risolve il componente template dal registry
  // Usa template.slug (es. "articolo", "faq") oppure "default" come fallback
  const templateSlug = page.template?.slug ?? "default";
  const TemplateComponent = getLayoutComponent(templateSlug);

  // Parsa i dati custom dalla pagina
  const fields = parseCustomFields(page.customFields);
  const styleConfig = parseStyleConfig(page.template?.styleConfig);

  return (
    <TemplateComponent
      page={page}
      template={page.template ?? null}
      fields={fields}
      styleConfig={styleConfig}
      isPreview={false}
    />
  );
}
