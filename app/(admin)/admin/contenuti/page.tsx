import { getAllPages } from "@/lib/db/pages-queries";
import { Suspense } from "react";
import PageManager from "./_components/page-manager";

// Pagina admin con query DB — disabilita il prerender statico
export const dynamic = "force-dynamic";

async function ContenutiContent() {
  const pages = await getAllPages();
  return <PageManager initialPages={pages} />;
}

export default function ContenutiPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--admin-text)" }}
        >
          Contenuti
        </h2>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--admin-text-muted)" }}
        >
          Gestisci le pagine statiche del sito (privacy, condizioni, cookie, ecc.).
          I meta SEO si configurano separatamente in <strong>SEO → Meta Tags</strong>.
        </p>
      </div>

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
          <ContenutiContent />
        </Suspense>
      </div>
    </div>
  );
}
