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
 * Se il valore è null/undefined/vuoto non viene emesso nessun tag robots
 * (il browser usa il default: index, follow).
 */
function mapRobots(robots?: string | null): Metadata["robots"] | undefined {
  if (robots === "noindex,nofollow") {
    return { index: false, follow: false };
  }
  if (robots === "noindex,follow") {
    return { index: false, follow: true };
  }
  return undefined;
}

/** Genera metadata per una pagina leggendo da DB, con fallback sensati. */
export async function generatePageMetadata(
  pathname: string,
  defaults?: { title?: string; description?: string },
): Promise<Metadata> {
  const [row, settings, siteUrl] = await Promise.all([
    getSeoPage(pathname),
    getAppSettings(),
    getSiteUrl(),
  ]);

  const appName = settings.app_name?.trim() || APP_NAME;
  const resolve = (text: string) => resolvePlaceholders(text, appName);

  const title = resolve(row?.title || defaults?.title || APP_NAME);
  const description = resolve(
    row?.description ||
    defaults?.description ||
    `Benvenuto su ${APP_NAME}.`
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
