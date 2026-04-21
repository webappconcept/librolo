"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import type { Role } from "@/lib/db/schema";
import type { AppSettings } from "@/lib/db/settings-queries";
import { Loader2, Save } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveUsersSettings, type ActionState } from "../actions";

// ---------------------------------------------------------------------------
// Wrapper esterno (reset al cambio pathname)
// ---------------------------------------------------------------------------
export function SignInTab({
  settings,
  roles,
}: {
  settings: AppSettings;
  roles: Role[];
}) {
  const pathname = usePathname();
  return <SignInTabInner key={pathname} settings={settings} roles={roles} />;
}

// ---------------------------------------------------------------------------
// Inner
// ---------------------------------------------------------------------------
function SignInTabInner({
  settings,
  roles,
}: {
  settings: AppSettings;
  roles: Role[];
}) {
  return (
    <div className="space-y-5">
      <RegistrazionePanel settings={settings} roles={roles} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pannello Registrazione
// ---------------------------------------------------------------------------
function RegistrazionePanel({
  settings,
  roles,
}: {
  settings: AppSettings;
  roles: Role[];
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    saveUsersSettings,
    {},
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const lastTs = useRef<number>(0);
  const [selectedRole, setSelectedRole] = useState(
    settings.default_role || "member",
  );

  useEffect(() => {
    if (!("timestamp" in state)) return;
    if (state.timestamp === lastTs.current) return;
    lastTs.current = state.timestamp;
    if ("success" in state && state.success)
      setToast({ message: state.success, type: "success" });
    if ("error" in state && state.error)
      setToast({ message: state.error, type: "error" });
  }, [state]);

  const assignableRoles = roles.filter((r) => !r.isAdmin);
  const currentRole = assignableRoles.find((r) => r.name === selectedRole);

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
            Registrazione utenti
          </h3>
          <div className="space-y-5 max-w-lg">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--admin-text-muted)" }}>
                Ruolo predefinito alla registrazione
              </label>
              <p
                className="text-[11px] mb-2.5"
                style={{ color: "var(--admin-text-faint)" }}>
                Ruolo assegnato automaticamente a ogni nuovo utente che si
                registra. I ruoli con privilegi di amministratore non sono
                selezionabili.
              </p>
              {assignableRoles.length === 0 ? (
                <p
                  className="text-sm italic"
                  style={{ color: "var(--admin-text-faint)" }}>
                  Nessun ruolo non-admin disponibile. Crea almeno un ruolo nella
                  sezione Utenti › Ruoli.
                </p>
              ) : (
                <select
                  name="default_role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: "var(--admin-page-bg)",
                    border: "1px solid var(--admin-input-border)",
                    color: "var(--admin-text)",
                  }}>
                  {assignableRoles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.label}
                    </option>
                  ))}
                </select>
              )}
              {currentRole && (
                <div
                  className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: currentRole.color + "18",
                    border: `1px solid ${currentRole.color}33`,
                  }}>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: currentRole.color }}
                  />
                  <span
                    className="font-medium"
                    style={{ color: currentRole.color }}>
                    {currentRole.label}
                  </span>
                  {currentRole.description && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--admin-text-faint)" }}>
                      &mdash; {currentRole.description}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-4">
                <p
                  className="text-[11px] mb-2"
                  style={{ color: "var(--admin-text-faint)" }}>
                  Ruoli disponibili
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {assignableRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.name)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all"
                      style={{
                        background:
                          selectedRole === role.name
                            ? role.color + "33"
                            : role.color + "18",
                        color: role.color,
                        border: `1px solid ${selectedRole === role.name ? role.color + "88" : role.color + "33"}`,
                        outline:
                          selectedRole === role.name
                            ? `2px solid ${role.color}44`
                            : "none",
                        outlineOffset: "1px",
                      }}>
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: role.color }}
                      />
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending || assignableRoles.length === 0}
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
