// app/(admin)/admin/security/blocked-domains/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { Globe } from "lucide-react";
import { requireAdminPage } from "@/lib/rbac/guards";
import { db } from "@/lib/db/drizzle";
import { disposableDomains } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { BlockedDomainsClient } from "./_components/blocked-domains-client";

export const metadata: Metadata = {
  title: "Sicurezza / Domini Bloccati",
};

async function BlockedDomainsContent() {
  const dbDomains = await db
    .select({ domain: disposableDomains.domain })
    .from(disposableDomains)
    .orderBy(asc(disposableDomains.domain));
  return <BlockedDomainsClient initialDomains={dbDomains.map((r) => r.domain)} />;
}

export default async function AdminBlockedDomainsPage() {
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
          <Globe size={18} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--admin-text)" }}>
            <span style={{ color: "var(--admin-text-muted)" }}>Sicurezza</span>
            <span style={{ color: "var(--admin-text-faint)" }}> / </span>
            <span>Domini Bloccati</span>
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
            Gestisci i domini email usa-e-getta bloccati dalla registrazione.
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
        <BlockedDomainsContent />
      </Suspense>
    </div>
  );
}
