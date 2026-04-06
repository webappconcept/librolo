import { getAppSettings } from "@/lib/db/settings-queries";
import { Suspense } from "react";
import { SettingsForm } from "./settings-form";

async function SettingsContent() {
  const settings = await getAppSettings();
  return <SettingsForm settings={settings} />;
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--admin-text)" }}>
          Impostazioni
        </h2>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--admin-text-muted)" }}>
          Configurazione generale dell'app
        </p>
      </div>

      <Suspense
        fallback={
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-9 bg-gray-50 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        }>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
