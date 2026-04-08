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

function getPublicAppRoutes(): string[] {
  const paths = new Set<string>([
    ...PUBLIC_ROUTES,
    ...NAV_ITEMS.map((i) => i.href),
    ...USER_MENU_ITEMS.map((i) => i.href),
    ...FOOTER_LINKS.map((i) => i.href),
  ]);
  return [...paths]
    .filter((p) => !p.startsWith("/admin"))
    .sort();
}

async function SeoContent() {
  const [pages, settings] = await Promise.all([
    getAllSeoPages(),
    getAppSettings(),
  ]);

  let domain = settings.app_domain?.trim() ?? "";
  if (domain && !/^https?:\/\//i.test(domain)) domain = `https://${domain}`;
  domain = domain.replace(/\/$/, "");

  const appName = settings.app_name?.trim() ?? "";

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
      appName={appName}
    />
  );
}

export default function SeoPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--admin-text)" }}>
          SEO
        </h2>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--admin-text-muted)" }}>
          Gestisci i meta tag delle pagine dell&apos;app.
        </p>
      </div>

      <div
        className="rounded-xl shadow-sm p-5"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-32">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
              />
            </div>
          }>
          <SeoContent />
        </Suspense>
      </div>
    </div>
  );
}
