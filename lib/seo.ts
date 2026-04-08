import { getSeoPage as _getSeoPage } from "@/lib/db/seo-queries";
import { getAppSettings as _getAppSettings } from "@/lib/db/settings-queries";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
/**
 * Versione cached di getSeoPage — revalidata ogni 60s o su revalidateTag('seo').
 */
const getCachedSeoPage = unstable_cache(
  (pathname: string) => _getSeoPage(pathname),
  ["seo-page"],
  { revalidate: 60, tags: ["seo"] },
);

/**
 * Versione cached di getAppSettings — revalidata ogni 60s o su revalidateTag('settings').
 */
const getCachedAppSettings = unstable_cache(
  () => _getAppSettings(),
  ["app-settings"],
  { revalidate: 60, tags: ["settings"] },
);

/**
 * Restituisce il dominio configurato nelle impostazioni.
 * Normalizza aggiungendo "https://" se mancante e rimuovendo lo slash finale.
 */
export async function getSiteUrl(): Promise<string> {
  const settings = await getCachedAppSettings();
  let domain = settings.app_domain?.trim() ?? "";
  if (!domain) return "";
  if (!/^https?:\/\//i.test(domain)) domain = `https://${domain}`;
  return domain.replace(/\/$/, "");
}

/**
 * Sostituisce i placeholder supportati nel testo dei meta tag.
 * - {appName} → nome dell'app letto dalle impostazioni generali
 */
function resolvePlaceholders(text: string, appName: string): string {
  if (!text || !appName) return text;
  return text.replace(/\{appName\}/gi, appName);
}

/**
 * Converte il valore stringa salvato in DB nel formato robots atteso da Next.js.
 */
function mapRobots(robots?: string | null): Metadata["robots"] | undefined {
  if (robots === "noindex,nofollow") return { index: false, follow: false };
  if (robots === "noindex,follow") return { index: false, follow: true };
  return undefined;
}

/**
 * Genera metadata per una pagina leggendo da DB (con cache), con fallback sensati.
 * Il nome dell'app viene letto dinamicamente dalle impostazioni — mai hardcoded.
 */
export async function generatePageMetadata(
  pathname: string,
  defaults?: { title?: string; description?: string },
): Promise<Metadata> {
  await connection();
  const [row, settings, siteUrl] = await Promise.all([
    getCachedSeoPage(pathname),
    getCachedAppSettings(),
    getSiteUrl(),
  ]);

  const appName = settings.app_name?.trim() || "App";
  const resolve = (text: string) => resolvePlaceholders(text, appName);

  const title = resolve(row?.title || defaults?.title || appName);
  const description = resolve(
    row?.description || defaults?.description || `Benvenuto su ${appName}.`,
  );
  const ogTitle = resolve(row?.ogTitle || title);
  const ogDescription = resolve(row?.ogDescription || description);

  const canonical = siteUrl ? `${siteUrl}${pathname}` : undefined;
  const robots = mapRobots(row?.robots);

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    ...(robots ? { robots } : {}),
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
