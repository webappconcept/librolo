// app/(admin)/admin/settings/tabs/email-tab.tsx
"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import type { AppSettings } from "@/lib/db/settings-queries";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveEmailSettings, type ActionState } from "../actions";

export function EmailTab({ settings }: { settings: AppSettings }) {
  const pathname = usePathname();
  return <EmailTabInner key={pathname} settings={settings} />;
}

function EmailTabInner({ settings }: { settings: AppSettings }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    saveEmailSettings,
    {},
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const lastTs = useRef<number>(0);

  useEffect(() => {
    if (!("timestamp" in state)) return;
    if (state.timestamp === lastTs.current) return;
    lastTs.current = state.timestamp;
    if ("success" in state && state.success)
      setToast({ message: state.success, type: "success" });
    if ("error" in state && state.error)
      setToast({ message: state.error, type: "error" });
  }, [state]);

  const inputStyle = {
    background: "var(--admin-page-bg)",
    border: "1px solid var(--admin-input-border)",
    color: "var(--admin-text)",
  };

  return (
    <>
      <form action={formAction} className="space-y-5">
        {/* Resend API Key */}
        <div
          className="rounded-xl shadow-sm p-6"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}>
          <div className="flex items-center justify-between mb-5">
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--admin-text)" }}>
              Resend
            </h3>
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: "var(--admin-accent)" }}>
              Ottieni API Key <ExternalLink size={11} />
            </a>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--admin-text-muted)" }}>
                API Key
              </label>
              <div className="relative">
                <input
                  name="resend_api_key"
                  type={showKey ? "text" : "password"}
                  defaultValue={settings.resend_api_key ?? ""}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-20 text-sm rounded-lg focus:outline-none transition-colors font-mono"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium px-2 py-0.5 rounded transition-colors"
                  style={{ color: "var(--admin-text-faint)" }}>
                  {showKey ? "Nascondi" : "Mostra"}
                </button>
              </div>
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--admin-text-faint)" }}>
                Salvata in modo sicuro. Non viene mai esposta nel frontend.
              </p>
            </div>
          </div>
        </div>

        {/* Mittente */}
        <div
          className="rounded-xl shadow-sm p-6"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}>
          <h3
            className="text-sm font-semibold mb-5"
            style={{ color: "var(--admin-text)" }}>
            Mittente
          </h3>

          <div className="space-y-4 max-w-lg">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--admin-text-muted)" }}>
                Nome mittente
              </label>
              <input
                name="email_from_name"
                defaultValue={settings.email_from_name ?? settings.app_name}
                placeholder="Il mio servizio"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--admin-text-muted)" }}>
                Indirizzo mittente
              </label>
              <input
                name="email_from_address"
                type="email"
                defaultValue={settings.email_from_address ?? ""}
                placeholder="noreply@tuodominio.com"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
                style={inputStyle}
              />
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--admin-text-faint)" }}>
                Deve essere un dominio verificato su Resend.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "var(--admin-accent)" }}
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
          {isPending ? "Salvataggio..." : "Salva"}
        </button>
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
