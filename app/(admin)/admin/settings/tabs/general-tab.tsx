// app/(admin)/admin/settings/tabs/general-tab.tsx
"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import type { AppSettings } from "@/lib/db/settings-queries";
import { Globe, Loader2, Save } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveAppSettings, type ActionState } from "../actions";

export function GeneralTab({ settings }: { settings: AppSettings }) {
  const pathname = usePathname();
  return <GeneralTabInner key={pathname} settings={settings} />;
}

function GeneralTabInner({ settings }: { settings: AppSettings }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    saveAppSettings,
    {},
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
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

  // Mostra il dominio già pulito (senza protocollo) nel campo
  const cleanDomain = (settings.app_domain ?? "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");

  return (
    <>
      <form action={formAction} className="space-y-5">
        <div
          className="rounded-xl shadow-sm p-6"
          style={{
            background: "var(--admin-card-bg)",
            border: "1px solid var(--admin-card-border)",
          }}>
          <h3
            className="text-sm font-semibold mb-5"
            style={{ color: "var(--admin-text)" }}>
            Identit&agrave; dell&apos;app
          </h3>

          <div className="space-y-4 max-w-lg">
            {/* Nome */}
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

            {/* Descrizione */}
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
              <div className="flex items-center rounded-lg overflow-hidden"
                style={{
                  border: "1px solid var(--admin-input-border)",
                }}>
                <span
                  className="px-3 py-2 text-sm select-none shrink-0"
                  style={{
                    background: "var(--admin-hover-bg)",
                    color: "var(--admin-text-faint)",
                    borderRight: "1px solid var(--admin-input-border)",
                  }}>
                  https://
                </span>
                <input
                  name="app_domain"
                  defaultValue={cleanDomain}
                  maxLength={253}
                  placeholder="esempio.it"
                  className="flex-1 px-3 py-2 text-sm focus:outline-none transition-colors"
                  style={{
                    background: "var(--admin-page-bg)",
                    color: "var(--admin-text)",
                  }}
                />
              </div>
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--admin-text-faint)" }}>
                Solo il dominio, senza protocollo (es.{" "}
                <code className="font-mono">esempio.it</code> oppure{" "}
                <code className="font-mono">app.esempio.it</code>).{" "}
                Il prefisso <code className="font-mono">https://</code> viene aggiunto automaticamente.
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
