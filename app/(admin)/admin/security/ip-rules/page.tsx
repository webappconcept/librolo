// app/(admin)/admin/security/ip-rules/page.tsx
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/rbac/guards";
import { ListFilter } from "lucide-react";
import { Suspense } from "react";
import { IpRulesClient } from "./_components/ip-rules-client";

export const metadata: Metadata = { title: "Regole IP" };

export default async function AdminIpRulesPage() {
  await requireAdminPage();

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
          <ListFilter size={18} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--admin-text)" }}>
            Regole IP
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
            Gestisci whitelist e blacklist degli indirizzi IP
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-40">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
            />
          </div>
        }
      >
        <IpRulesClient />
      </Suspense>
    </div>
  );
}
