// app/(admin)/admin/settings/tabs/signin-tab.tsx
"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import type { AppSettings } from "@/lib/db/settings-queries";
import type { Role } from "@/lib/db/schema";
import { Loader2, Plus, Save, Search, Trash2, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addDisposableDomainAction,
  bulkImportDisposableDomainsAction,
  removeDisposableDomainAction,
  saveUsersSettings,
  type ActionState,
} from "../actions";

type SubTab = "registrazione" | "domini";

// ---------------------------------------------------------------------------
// Wrapper esterno (reset al cambio pathname)
// ---------------------------------------------------------------------------
export function SignInTab({
  settings,
  roles,
  initialDomains,
}: {
  settings: AppSettings;
  roles: Role[];
  initialDomains: string[];
}) {
  const pathname = usePathname();
  return (
    <SignInTabInner
      key={pathname}
      settings={settings}
      roles={roles}
      initialDomains={initialDomains}
    />
  );
}

// ---------------------------------------------------------------------------
// Inner
// ---------------------------------------------------------------------------
function SignInTabInner({
  settings,
  roles,
  initialDomains,
}: {
  settings: AppSettings;
  roles: Role[];
  initialDomains: string[];
}) {
  const [subTab, setSubTab] = useState<SubTab>("registrazione");

  return (
    <div className="space-y-5">
      {/* Sub-nav */}
      <div className="flex gap-1">
        {(["registrazione", "domini"] as SubTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            className="px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-all"
            style={{
              background: subTab === t ? "var(--admin-accent)" : "transparent",
              color: subTab === t ? "#fff" : "var(--admin-text-muted)",
              border: subTab === t ? "none" : "1px solid var(--admin-card-border)",
            }}>
            {t === "registrazione" ? "Registrazione" : "Domini bloccati"}
          </button>
        ))}
      </div>

      {/* Pannelli */}
      {subTab === "registrazione" && (
        <RegistrazionePanel settings={settings} roles={roles} />
      )}
      {subTab === "domini" && (
        <DominiPanel initialDomains={initialDomains} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pannello Registrazione (ex UsersSettingsTab)
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const lastTs = useRef<number>(0);
  const [selectedRole, setSelectedRole] = useState(settings.default_role || "member");

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
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text)" }}>
            Registrazione utenti
          </h3>
          <div className="space-y-5 max-w-lg">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-muted)" }}>
                Ruolo predefinito alla registrazione
              </label>
              <p className="text-[11px] mb-2.5" style={{ color: "var(--admin-text-faint)" }}>
                Ruolo assegnato automaticamente a ogni nuovo utente che si registra.
                I ruoli con privilegi di amministratore non sono selezionabili.
              </p>
              {assignableRoles.length === 0 ? (
                <p className="text-sm italic" style={{ color: "var(--admin-text-faint)" }}>
                  Nessun ruolo non-admin disponibile. Crea almeno un ruolo nella sezione Utenti › Ruoli.
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
                    <option key={role.id} value={role.name}>{role.label}</option>
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
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: currentRole.color }} />
                  <span className="font-medium" style={{ color: currentRole.color }}>{currentRole.label}</span>
                  {currentRole.description && (
                    <span className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
                      &mdash; {currentRole.description}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-4">
                <p className="text-[11px] mb-2" style={{ color: "var(--admin-text-faint)" }}>Ruoli disponibili</p>
                <div className="flex flex-wrap gap-1.5">
                  {assignableRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.name)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all"
                      style={{
                        background: selectedRole === role.name ? role.color + "33" : role.color + "18",
                        color: role.color,
                        border: `1px solid ${selectedRole === role.name ? role.color + "88" : role.color + "33"}`,
                        outline: selectedRole === role.name ? `2px solid ${role.color}44` : "none",
                        outlineOffset: "1px",
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: role.color }} />
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
          onMouseEnter={(e) => !isPending && (e.currentTarget.style.background = "var(--admin-accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--admin-accent)}")}>
          {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {isPending ? "Salvataggio..." : "Salva"}
        </button>
      </form>
      {toast && (
        <AdminToast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Pannello Domini bloccati
// ---------------------------------------------------------------------------
function DominiPanel({ initialDomains }: { initialDomains: string[] }) {
  const [domains, setDomains] = useState<string[]>(initialDomains);
  const [search, setSearch] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [bulk, setBulk] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isBulkPending, startBulkTransition] = useTransition();

  const filtered = search
    ? domains.filter((d) => d.includes(search.toLowerCase().trim()))
    : domains;

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
  }

  // --- Aggiunta singola ---
  function handleAdd() {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    if (domains.includes(domain)) {
      showToast(`${domain} è già in lista.`, "error");
      return;
    }
    startTransition(async () => {
      const res = await addDisposableDomainAction(domain);
      if ("success" in res) {
        setDomains((prev) => [domain, ...prev].sort());
        setNewDomain("");
        showToast(res.success, "success");
      } else if ("error" in res) {
        showToast(res.error, "error");
      }
    });
  }

  // --- Rimozione ---
  function handleRemove(domain: string) {
    startTransition(async () => {
      const res = await removeDisposableDomainAction(domain);
      if ("success" in res) {
        setDomains((prev) => prev.filter((d) => d !== domain));
        showToast(res.success, "success");
      } else if ("error" in res) {
        showToast(res.error, "error");
      }
    });
  }

  // --- Import bulk ---
  function handleBulk() {
    const lines = bulk
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l.length > 0 && !domains.includes(l));
    if (lines.length === 0) {
      showToast("Nessun nuovo dominio da importare.", "error");
      return;
    }
    startBulkTransition(async () => {
      const res = await bulkImportDisposableDomainsAction(lines);
      if ("success" in res) {
        setDomains((prev) => [...prev, ...lines].sort());
        setBulk("");
        showToast(res.success, "success");
      } else if ("error" in res) {
        showToast(res.error, "error");
      }
    });
  }

  return (
    <>
      <div
        className="rounded-xl shadow-sm p-6 space-y-6"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>

        {/* Aggiunta singola */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--admin-text)" }}>
            Aggiungi dominio
          </h3>
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
              placeholder="es. mailinator.com"
              className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
              style={{
                background: "var(--admin-page-bg)",
                border: "1px solid var(--admin-input-border)",
                color: "var(--admin-text)",
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !newDomain.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--admin-accent)" }}
              onMouseEnter={(e) => !isPending && (e.currentTarget.style.background = "var(--admin-accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--admin-accent)")}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Aggiungi
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--admin-card-border)" }} />

        {/* Import bulk */}
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--admin-text)" }}>
            Import bulk
          </h3>
          <p className="text-[11px] mb-3" style={{ color: "var(--admin-text-faint)" }}>
            Un dominio per riga. I duplicati vengono ignorati.
          </p>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder={"trashmail.com\nyopmail.com\nguerrilla.com"}
            className="w-full max-w-md px-3 py-2 text-sm rounded-lg focus:outline-none resize-y font-mono"
            style={{
              background: "var(--admin-page-bg)",
              border: "1px solid var(--admin-input-border)",
              color: "var(--admin-text)",
            }}
          />
          <div className="mt-2">
            <button
              type="button"
              onClick={handleBulk}
              disabled={isBulkPending || !bulk.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--admin-accent)" }}
              onMouseEnter={(e) => !isBulkPending && (e.currentTarget.style.background = "var(--admin-accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--admin-accent)")}
            >
              {isBulkPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {isBulkPending
                ? "Importazione..."
                : `Importa ${
                    bulk.split("\n").filter((l) => l.trim() && !domains.includes(l.trim().toLowerCase())).length
                  } domini`}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--admin-card-border)" }} />

        {/* Lista */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
              Domini bloccati{" "}
              <span className="font-normal text-xs" style={{ color: "var(--admin-text-muted)" }}>
                ({domains.length})
              </span>
            </h3>
            {/* Ricerca */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--admin-text-faint)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca..."
                className="pl-7 pr-3 py-1.5 text-xs rounded-lg focus:outline-none"
                style={{
                  background: "var(--admin-page-bg)",
                  border: "1px solid var(--admin-input-border)",
                  color: "var(--admin-text)",
                  width: "160px",
                }}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--admin-text-faint)" }}>
              {search ? `Nessun risultato per "${search}"` : "Nessun dominio bloccato."}
            </p>
          ) : (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--admin-card-border)" }}>
              <div
                className="overflow-y-auto"
                style={{ maxHeight: "320px" }}>
                {filtered.map((domain, i) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                    style={{
                      background: i % 2 === 0 ? "var(--admin-card-bg)" : "var(--admin-page-bg)",
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--admin-card-border)" : "none",
                    }}>
                    <span className="font-mono text-xs" style={{ color: "var(--admin-text)" }}>
                      {domain}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(domain)}
                      disabled={isPending}
                      className="p-1 rounded transition-colors disabled:opacity-40"
                      title="Rimuovi"
                      style={{ color: "var(--admin-text-faint)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-danger, #e53e3e)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-faint)")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <AdminToast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
