import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageWithTemplate, getPublishedPages } from "@/lib/db/pages-queries";
import { getDynamicTemplate } from "../_templates/loader";
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
// Banner preview — mostrato solo per pagine non pubblicate in anteprima
// Tenuto qui e non nei template: ogni template deve occuparsi solo del layout.
// ---------------------------------------------------------------------------
function PreviewBanner() {
  return (
    <div
      style={{
        background: "#fbbf24",
        color: "#1a1a1a",
        textAlign: "center",
        padding: "0.5rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}>
      ⚠️ Anteprima — non pubblicata
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default async function FrontendPage({ params }: Props) {
  const { slug } = await params;
  const slugPath = slug.join("/");

  // Recupera pagina + template + campi dal DB
  const page = await getPageWithTemplate(slugPath);

  // La pagina deve esistere (le bozze sono accessibili solo in preview)
  if (!page) return notFound();

  const isPreview = page.status !== "published";

  // In produzione le pagine non pubblicate restituiscono 404
  // (il parametro ?preview=1 potrà bypassare questo controllo in futuro)
  if (isPreview) return notFound();

  // Risolve il componente template tramite loader (async, import dinamico)
  const templateSlug = page.template?.slug ?? "default";
  const TemplateComponent = await getDynamicTemplate(templateSlug);

  // Parsa i dati custom dalla pagina
  const fields = parseCustomFields(page.customFields);
  const styleConfig = parseStyleConfig(page.template?.styleConfig);

  return (
    <>
      {isPreview && <PreviewBanner />}
      <TemplateComponent
        page={page}
        template={page.template ?? null}
        fields={fields}
        styleConfig={styleConfig}
      />
    </>
  );
}
