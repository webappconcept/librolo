import type { Metadata } from "next";
import { getSeoPage } from "@/lib/db/seo-queries";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Librolo";

/** Genera metadata per una pagina leggendo da DB, con fallback sensati. */
export async function generatePageMetadata(
  pathname: string,
  defaults?: { title?: string; description?: string },
): Promise<Metadata> {
  const row = await getSeoPage(pathname);

  const title = row?.title || defaults?.title || APP_NAME;
  const description =
    row?.description ||
    defaults?.description ||
    `Benvenuto su ${APP_NAME}.`;
  const ogTitle = row?.ogTitle || title;
  const ogDescription = row?.ogDescription || description;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      ...(row?.ogImage ? { images: [{ url: row.ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      ...(row?.ogImage ? { images: [row.ogImage] } : {}),
    },
  };
}
