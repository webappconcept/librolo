// app/(admin)/admin/settings/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { getAllSnippets } from "@/lib/db/snippets-queries";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const [settings, snippets] = await Promise.all([
    getAppSettings(),
    getAllSnippets(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--admin-text)" }}>
          Impostazioni
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--admin-text-muted)" }}>
          Configura il comportamento dell'applicazione.
        </p>
      </div>
      <SettingsTabs settings={settings} snippets={snippets} />
    </div>
  );
}
