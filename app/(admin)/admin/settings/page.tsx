// app/(admin)/admin/settings/page.tsx
import { getAppSettings } from "@/lib/db/settings-queries";
import { Save, Settings } from "lucide-react";
import { Suspense } from "react";
import { saveAppSettings } from "./actions";
import { SettingToggle } from "./toggles";

async function SettingsContent() {
  const settings = await getAppSettings();

  return (
    <form action={saveAppSettings} className="space-y-6">
      {/* Identità app */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">
            Identità dell'app
          </h3>
        </div>

        <div className="space-y-4 max-w-lg">
          {/* Nome app */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Nome dell'app
            </label>
            <input
              name="app_name"
              defaultValue={settings.app_name}
              maxLength={60}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/30 focus:border-[#e07a3a]"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Usato nell'header, nelle email e nei meta tag.
            </p>
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Descrizione breve
            </label>
            <textarea
              name="app_description"
              defaultValue={settings.app_description}
              maxLength={160}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/30 focus:border-[#e07a3a] resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Mostrata come sottotitolo e nei meta description. Max 160
              caratteri.
            </p>
          </div>
        </div>
      </div>

      {/* Comportamento */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Comportamento</h3>
        </div>

        <div className="divide-y divide-gray-100 max-w-lg">
          <SettingToggle
            name="registrations_enabled"
            label="Registrazioni aperte"
            description="Permetti a nuovi utenti di registrarsi"
            defaultValue={settings.registrations_enabled === "true"}
            activeColor="bg-green-500"
          />
          <SettingToggle
            name="maintenance_mode"
            label="Modalità manutenzione"
            description="Gli utenti vedranno una pagina di manutenzione"
            defaultValue={settings.maintenance_mode === "true"}
            activeColor="bg-red-500"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#e07a3a] text-white text-sm font-medium rounded-lg hover:bg-[#c9642a] transition-colors">
          <Save size={15} />
          Salva impostazioni
        </button>
      </div>
    </form>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Impostazioni</h2>
        <p className="text-sm text-gray-400 mt-0.5">
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
