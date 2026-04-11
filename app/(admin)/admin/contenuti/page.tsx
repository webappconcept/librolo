import { getAllPages } from "@/lib/db/pages-queries";
import { getAllTemplates } from "@/lib/db/template-queries";
import { FileText } from "lucide-react";
import { Suspense } from "react";
import PageManager from "./_components/page-manager";

export const dynamic = "force-dynamic";

async function ContenutiContent() {
  const [pages, templates] = await Promise.all([getAllPages(), getAllTemplates()]);
  return <PageManager initialPages={pages} templates={templates} />;
}

export default function ContenutiPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--admin-accent) 12%, var(--admin-card-bg))",
            border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
          }}
        >
          <FileText size={18} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--admin-text)" }}>
            Contenuti
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
            Gestisci le pagine statiche del sito (privacy, condizioni, cookie, ecc.).
            I meta SEO si configurano separatamente in <strong>SEO → Meta Tags</strong>.
          </p>
        </div>
      </div>

      <div className="rounded-xl shadow-sm p-5"
        style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
              />
            </div>
          }
        >
          <ContenutiContent />
        </Suspense>
      </div>
    </div>
  );
}
