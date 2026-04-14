// app/(admin)/admin/tests/page.tsx
// Pannello visuale per eseguire i test auth direttamente dall'admin.
// Accessibile solo ai super admin (admin:access).
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/rbac/guards";
import { FlaskConical } from "lucide-react";
import { TestsClient } from "./_components/tests-client";

export const metadata: Metadata = { title: "Test Auth" };

export default async function AdminTestsPage() {
  await requireAdminPage();

  return (
    <div className="space-y-5">
      {/* Header sezione */}
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
            Test Auth
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
            Pannello visuale per verificare le procedure di autenticazione
          </p>
        </div>
      </div>

      <TestsClient />
    </div>
  );
}
