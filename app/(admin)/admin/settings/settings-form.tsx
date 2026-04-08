"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import type { AppSettings } from "@/lib/db/settings-queries";
import { Globe, Loader2, Save, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveAppSettings, type ActionState } from "./actions";
import { SettingToggle } from "./toggles";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const pathname = usePathname();
  return <SettingsFormInner key={pathname} settings={settings} />;
}

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
        <div
          className="rounded-xl shadow-sm p-6"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}>
          <div className="flex items-center gap-2 mb-5">
            <Settings size={16} style={{ color: "var(--admin-text-faint)" }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--admin-text)" }}>
              Identità dell&apos;app
            </h3>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--admin-text-muted)" }}>
                Nome dell&apos;app
              </label>
              <input
                name="app_name"
                defaultValue={settings.app_name}
                maxLength={60}
                required
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
                style={{
                  background: "var(--admin-page-bg)",
                  border: "1px solid var(--admin-input-border)",
                  color: "var(--admin-text)",
                }}
              />
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--admin-text-faint)" }}>
                Usato nell&apos;header, nelle email e nei meta tag.
              </p>
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--admin-text-muted)" }}>
                Descrizione breve
              </label>
              <textarea
                name="app_description"
                defaultValue={settings.app_description}
                maxLength={160}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors resize-none"
                style={{
                  background: "var(--admin-page-bg)",
                  border: "1px solid var(--admin-input-border)",
                  color: "var(--admin-text)",
                }}
              />
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--admin-text-faint)" }}>
                Mostrata come sottotitolo e nei meta description. Max 160
                caratteri.
              </p>
            </div>

            {/* Dominio */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--admin-text-muted)" }}>
                <span className="flex items-center gap-1.5">
                  <Globe size={12} />
                  Dominio del sito
                </span>
              </label>
              <input
                name="app_domain"
                defaultValue={settings.app_domain ?? ""}
                maxLength={253}
                placeholder="librolo.it"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
                style={{
                  background: "var(--admin-page-bg)",
                  border: "1px solid var(--admin-input-border)",
                  color: "var(--admin-text)",
                }}
              />
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--admin-text-faint)" }}>
                Usato nella preview SEO, nei canonical URL e in tutti i link
                assoluti. Puoi scrivere solo il dominio (es.{" "}
                <code className="font-mono">librolo.it</code>) oppure con
                prefisso (es.{" "}
                <code className="font-mono">https://librolo.it</code>).
              </p>
            </div>
          </div>
        </div>

        {/* Comportamento */}
        <div
          className="rounded-xl shadow-sm p-6"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}>
          <div className="flex items-center gap-2 mb-3">
            <Settings size={16} style={{ color: "var(--admin-text-faint)" }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--admin-text)" }}>
              Comportamento
            </h3>
          </div>

          <div
            className="max-w-lg"
            style={{ borderTop: "1px solid var(--admin-divider)" }}>
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
            className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isPending
                ? "var(--admin-accent)"
                : "var(--admin-accent)",
            }}
            onMouseEnter={(e) =>
              !isPending &&
              (e.currentTarget.style.background = "var(--admin-accent-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--admin-accent)")
            }>
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
