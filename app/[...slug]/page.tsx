import { getPageBySlug } from "@/lib/db/pages-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { getSeoPage } from "@/lib/db/seo-queries";
import { resolvePlaceholders } from "@/lib/utils/content-placeholders";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string[] }>;
}

function isPubliclyVisible(page: Awaited<ReturnType<typeof getPageBySlug>>) {
  if (!page || page.status !== "published") return false;
  if (page.expiresAt && new Date(page.expiresAt) <= new Date()) return false;
  return true;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const [page, seo] = await Promise.all([
    getPageBySlug(fullSlug),
    getSeoPage(`/${fullSlug}`),
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
  const fullSlug = slug.join("/");
  const [page, settings] = await Promise.all([
    getPageBySlug(fullSlug),
    getAppSettings(),
  ]);

  if (!isPubliclyVisible(page)) notFound();

  const resolvedContent = resolvePlaceholders(page!.content, settings);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        {page!.title}
      </h1>
      {resolvedContent ? (
        <div
          className="prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: resolvedContent }}
        />
      ) : (
        <p className="text-gray-500">Nessun contenuto disponibile.</p>
      )}
    </main>
  );
}
