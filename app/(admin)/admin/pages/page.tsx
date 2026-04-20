// app/(admin)/admin/pages/page.tsx
import type { Metadata } from "next";
import { getAppSettings } from "@/lib/db/settings-queries";
import { getAllPages } from "@/lib/db/pages-queries";
import { getAllTemplates } from "@/lib/db/template-queries";
import { Suspense } from "react";
import PageManager from "./_components/page-manager";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

async function PagesContent() {
  const [pages, templates, settings] = await Promise.all([
    getAllPages(),
    getAllTemplates(),
    getAppSettings(),
  ]);

  let appDomain = settings.app_domain ?? "";
  if (appDomain && !appDomain.startsWith("http")) {
    appDomain = `https://${appDomain}`;
  }
  appDomain = appDomain.replace(/\/+$/, "");

  return (
    <PageManager
      initialPages={pages}
      templates={templates}
      appDomain={appDomain}
    />
  );
}

export default function PagesPage() {
  return (
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
              style={{
                borderColor: "var(--admin-accent)",
                borderTopColor: "transparent",
              }}
            />
          </div>
        }>
        <PagesContent />
      </Suspense>
    </div>
  );
}
