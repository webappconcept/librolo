// app/(admin)/admin/tests/page.tsx
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/rbac/guards";
import { FlaskConical } from "lucide-react";
import { TestsClient } from "./_components/tests-client";

export const metadata: Metadata = { title: "Test" };

export default async function AdminTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const tab = params.tab ?? "auth";

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
          <FlaskConical size={18} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--admin-text)" }}>
            Test suite
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
            Pannello visuale per verificare le funzionalità dell&apos;applicazione
          </p>
        </div>
      </div>

      <TestsClient initialTab={tab} />
    </div>
  );
}
