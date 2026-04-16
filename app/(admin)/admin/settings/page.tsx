// app/(admin)/admin/settings/page.tsx
import type { Metadata } from "next";
import { db } from "@/lib/db/drizzle";
import { roles, disposableDomains } from "@/lib/db/schema";
import { getAppSettings } from "@/lib/db/settings-queries";
import { getAllSnippets } from "@/lib/db/snippets-queries";
import { asc } from "drizzle-orm";
import { SettingsTabs } from "./settings-tabs";

export const metadata: Metadata = { title: "Impostazioni" };

export default async function SettingsPage() {
  const [settings, snippets, allRoles, dbDomains] = await Promise.all([
    getAppSettings(),
    getAllSnippets(),
    db.select().from(roles).orderBy(asc(roles.sortOrder)),
    db.select({ domain: disposableDomains.domain })
      .from(disposableDomains)
      .orderBy(asc(disposableDomains.domain)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--admin-text)" }}>
          Impostazioni
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--admin-text-muted)" }}>
          Configura il comportamento dell&apos;applicazione.
        </p>
      </div>
      <SettingsTabs
        settings={settings}
        snippets={snippets}
        roles={allRoles}
        disposableDomains={dbDomains.map((r) => r.domain)}
      />
    </div>
  );
}
