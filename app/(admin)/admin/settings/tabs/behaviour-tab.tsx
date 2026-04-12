// app/(admin)/admin/settings/tabs/behaviour-tab.tsx
"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import type { AppSettings } from "@/lib/db/settings-queries";
import { Loader2, Save } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveBehaviourSettings, type ActionState } from "../actions";
import { SettingToggle } from "../toggles";

export function BehaviourTab({ settings }: { settings: AppSettings }) {
  const pathname = usePathname();
  return <BehaviourTabInner key={pathname} settings={settings} />;
}

function BehaviourTabInner({ settings }: { settings: AppSettings }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    saveBehaviourSettings,
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
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--admin-text)" }}>
            Comportamento
          </h3>

          <div
            className="max-w-lg divide-y"
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
