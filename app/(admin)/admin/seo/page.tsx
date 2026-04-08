import { getAllSeoPages } from "@/lib/db/seo-queries";
import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";
import SeoManager from "./_components/seo-manager";

async function SeoContent() {
  const [pages, settings] = await Promise.all([
    getAllSeoPages(),
    getAppSettings(),
  ]);

  // Normalizza il dominio: aggiunge https:// se mancante, rimuove slash finale
  let domain = settings.app_domain?.trim() ?? "";
  if (domain && !/^https?:\/\//i.test(domain)) domain = `https://${domain}`;
  domain = domain.replace(/\/$/, "");

  return <SeoManager initialPages={pages} domain={domain} />;
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
