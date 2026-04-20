// app/(admin)/admin/seo/meta-tags/page.tsx
import { getAllPages } from "@/lib/db/pages-queries";
import { getAllSeoPages } from "@/lib/db/seo-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { getActiveRoutes } from "@/lib/db/route-registry-queries";
import { Suspense } from "react";
import SeoManager from "../_components/seo-manager";

export const dynamic = "force-dynamic";

async function SeoContent() {
  const [seoPagesList, cmsPages, settings, registryRoutes] = await Promise.all([
    getAllSeoPages(),
    getAllPages(),
    getAppSettings(),
    getActiveRoutes(),
  ]);

  let domain = settings.app_domain?.trim() ?? "";
  if (domain && !/^https?:\/\//i.test(domain)) domain = `https://${domain}`;
  domain = domain.replace(/\/$/, "");

  const appName = settings.app_name?.trim() ?? "";

  const registryPaths = registryRoutes
    .filter((r) => r.visibility !== "admin")
    .map((r) => r.pathname);
  const cmsRoutes = cmsPages.map((p) => `/${p.slug}`);
  const allRoutes = [...new Set([...registryPaths, ...cmsRoutes])].sort();

  const configuredPaths = new Set(seoPagesList.map((p) => p.pathname));
  const unconfiguredRoutes = allRoutes.filter((r) => !configuredPaths.has(r));

  return (
    <SeoManager
      initialPages={seoPagesList}
      unconfiguredRoutes={unconfiguredRoutes}
      domain={domain}
      appName={appName}
    />
  );
}

export default function MetaTagsPage() {
  return (
    <div
      className="rounded-xl shadow-sm p-5"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px solid var(--admin-card-border)",
      }}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{
                borderColor: "var(--admin-accent)",
                borderTopColor: "transparent",
              }}
            />
          </div>
        }
      >
        <SeoContent />
      </Suspense>
    </div>
  );
}
