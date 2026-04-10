import { getPageBySlug } from "@/lib/db/pages-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Ogni pagina CMS è dinamica (contenuto dal DB)
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

// ─── Metadata SEO dinamici ────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [page, seo] = await Promise.all([
    getPageBySlug(slug),
    getSeoPage(`/${slug}`),
  ]);

  if (!page || page.status !== "published") return {};

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

// ─── Pagina pubblica ─────────────────────────────────────────────────
export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  // 404 se non esiste o è bozza
  if (!page || page.status !== "published") notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        {page.title}
      </h1>

      {page.content ? (
        <div
          className="prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      ) : (
        <p className="text-gray-500">Nessun contenuto disponibile.</p>
      )}
    </main>
  );
}
