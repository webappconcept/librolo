import { getPageBySlug } from "@/lib/db/pages-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Una pagina è visibile pubblicamente solo se:
 *  - status === "published"
 *  - expiresAt è null OPPURE expiresAt > now
 */
function isPubliclyVisible(page: Awaited<ReturnType<typeof getPageBySlug>>) {
  if (!page || page.status !== "published") return false;
  if (page.expiresAt && new Date(page.expiresAt) <= new Date()) return false;
  return true;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [page, seo] = await Promise.all([
    getPageBySlug(slug),
    getSeoPage(`/${slug}`),
  ]);

  if (!isPubliclyVisible(page)) return {};

  return {
    title: seo?.title ?? page!.title,
    description: seo?.description ?? undefined,
    robots: seo?.robots ?? undefined,
    openGraph: {
      title: seo?.ogTitle ?? seo?.title ?? page!.title,
      description: seo?.ogDescription ?? seo?.description ?? undefined,
      images: seo?.ogImage ? [seo.ogImage] : undefined,
    },
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!isPubliclyVisible(page)) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        {page!.title}
      </h1>
      {page!.content ? (
        <div
          className="prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: page!.content }}
        />
      ) : (
        <p className="text-gray-500">Nessun contenuto disponibile.</p>
      )}
    </main>
  );
}
