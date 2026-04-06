"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import type { AppSettings } from "@/lib/db/settings-queries";
import { Loader2, Save, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveAppSettings, type ActionState } from "./actions";
import { SettingToggle } from "./toggles";

// Wrapper esterno — forza il reset di useActionState ad ogni visita
export function SettingsForm({ settings }: { settings: AppSettings }) {
  const pathname = usePathname();
  return <SettingsFormInner key={pathname} settings={settings} />;
}

// Componente interno — viene ricreato da zero ad ogni navigazione
function SettingsFormInner({ settings }: { settings: AppSettings }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    saveAppSettings,
    {},
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const lastTimestamp = useRef<number>(0);

  useEffect(() => {
    if (!("timestamp" in state)) return;
    if (state.timestamp === lastTimestamp.current) return;
    lastTimestamp.current = state.timestamp;

    if ("success" in state && state.success)
      setToast({ message: state.success, type: "success" });
    if ("error" in state && state.error)
      setToast({ message: state.error, type: "error" });
  }, [state]);

  return (
    <>
      <form action={formAction} className="space-y-6">
        {/* Identità app */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Settings size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Identità dell'app
            </h3>
          </div>

          <div className="space-y-4 max-w-lg">
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
            <h3 className="text-sm font-semibold text-gray-700">
              Comportamento
            </h3>
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
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#e07a3a] text-white text-sm font-medium rounded-lg hover:bg-[#c9642a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {isPending ? "Salvataggio..." : "Salva impostazioni"}
          </button>
        </div>
      </form>

      {toast && (
        <AdminToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
