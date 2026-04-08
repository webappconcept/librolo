import { getAllSeoPages } from "@/lib/db/seo-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import {
  FOOTER_LINKS,
  NAV_ITEMS,
  PUBLIC_ROUTES,
  USER_MENU_ITEMS,
} from "@/lib/routes";
import { Suspense } from "react";
import SeoManager from "./_components/seo-manager";

/**
 * Derive tutti i pathname pubblici dell'app dalla fonte di verità `lib/routes.ts`.
 * Include: PUBLIC_ROUTES, NAV_ITEMS, USER_MENU_ITEMS, FOOTER_LINKS.
 * Le route admin (/admin/*) sono escluse — non hanno senso come pagine SEO pubbliche.
 */
function getPublicAppRoutes(): string[] {
  const paths = new Set<string>([
    ...PUBLIC_ROUTES,
    ...NAV_ITEMS.map((i) => i.href),
    ...USER_MENU_ITEMS.map((i) => i.href),
    ...FOOTER_LINKS.map((i) => i.href),
  ]);
  // Filtra le route admin/auth che non sono pagine pubbliche indicizzabili
  return [...paths]
    .filter((p) => !p.startsWith("/admin") && !p.startsWith("/sign") && !p.startsWith("/forgot") && !p.startsWith("/reset") && !p.startsWith("/verify"))
    .sort();
}

async function SeoContent() {
  const [pages, settings] = await Promise.all([
    getAllSeoPages(),
    getAppSettings(),
  ]);

  // Normalizza il dominio: aggiunge https:// se mancante, rimuove slash finale
  let domain = settings.app_domain?.trim() ?? "";
  if (domain && !/^https?:\/\//i.test(domain)) domain = `https://${domain}`;
  domain = domain.replace(/\/$/, "");

  const allPublicRoutes = getPublicAppRoutes();
  const configuredPaths = new Set(pages.map((p) => p.pathname));
  const unconfiguredRoutes = allPublicRoutes.filter(
    (r) => !configuredPaths.has(r),
  );

  return (
    <SeoManager
      initialPages={pages}
      unconfiguredRoutes={unconfiguredRoutes}
      domain={domain}
    />
  );
}

export default function SeoPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">SEO</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestisci i meta tag delle pagine dell&apos;app.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-[#e07a3a] border-t-transparent rounded-full animate-spin" />
          </div>
        }>
        <SeoContent />
      </Suspense>
    </div>
  );
}
