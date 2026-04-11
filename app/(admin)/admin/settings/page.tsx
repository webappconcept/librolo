// app/(admin)/admin/settings/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { Settings } from "lucide-react";
import { Suspense } from "react";
import { SettingsTabs } from "./settings-tabs";

async function SettingsContent() {
  const settings = await getAppSettings();
  return <SettingsTabs settings={settings} />;
}

export default function AdminSettingsPage() {
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
          <Settings size={18} style={{ color: "var(--admin-accent)" }} />
        </div>
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--admin-text)" }}>
            Impostazioni
          </h2>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--admin-text-muted)" }}>
            Configurazione generale dell&apos;app
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div
            className="rounded-xl p-6 space-y-4"
            style={{
              background: "var(--admin-card-bg)",
              border: "1px solid var(--admin-card-border)",
            }}>
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div
                  className="h-3 w-24 rounded animate-pulse"
                  style={{ background: "var(--admin-card-border)" }}
                />
                <div
                  className="h-9 rounded-lg animate-pulse"
                  style={{ background: "var(--admin-page-bg)" }}
                />
              </div>
            ))}
          </div>
        }>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
