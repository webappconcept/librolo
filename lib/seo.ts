import type { Metadata } from "next";
import { getSeoPage } from "@/lib/db/seo-queries";
import { getAppSettings } from "@/lib/db/settings-queries";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Librolo";

/**
 * Restituisce il dominio configurato nelle impostazioni (es. "https://librolo.it").
 * Normalizza aggiungendo "https://" se mancante e rimuovendo lo slash finale.
 * Usare questa funzione ovunque si costruisca un URL assoluto.
 */
export async function getSiteUrl(): Promise<string> {
  const settings = await getAppSettings();
  let domain = settings.app_domain?.trim() ?? "";
  if (!domain) return "";
  if (!/^https?:\/\//i.test(domain)) domain = `https://${domain}`;
  return domain.replace(/\/$/, "");
}

/** Genera metadata per una pagina leggendo da DB, con fallback sensati. */
export async function generatePageMetadata(
  pathname: string,
  defaults?: { title?: string; description?: string },
): Promise<Metadata> {
  const [row, siteUrl] = await Promise.all([
    getSeoPage(pathname),
    getSiteUrl(),
  ]);

  const title = row?.title || defaults?.title || APP_NAME;
  const description =
    row?.description ||
    defaults?.description ||
    `Benvenuto su ${APP_NAME}.`;
  const ogTitle = row?.ogTitle || title;
  const ogDescription = row?.ogDescription || description;

  const canonical = siteUrl ? `${siteUrl}${pathname}` : undefined;

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      ...(canonical ? { url: canonical } : {}),
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
