// app/(admin)/admin/security/blocked-usernames/_components/blocked-usernames-client.tsx
"use client";

import { AdminToast } from "@/app/(admin)/admin/_components/toast";
import { Loader2, Plus, Search, Trash2, Upload } from "lucide-react";
import { useState, useTransition } from "react";
import {
  addBlockedUsernameAction,
  bulkImportBlockedUsernamesAction,
  removeBlockedUsernameAction,
} from "@/app/(admin)/admin/settings/actions";

type Entry = { username: string; isPattern: boolean };

export function BlockedUsernamesClient({
  initialEntries,
}: {
  initialEntries: Entry[];
}) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [search, setSearch] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [isPattern, setIsPattern] = useState(false);
  const [bulk, setBulk] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isBulkPending, startBulkTransition] = useTransition();

  const filtered = search
    ? entries.filter((e) => e.username.includes(search.toLowerCase().trim()))
    : entries;

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
  }

  function buildRaw(value: string, pattern: boolean): string {
    const clean = value.trim().toLowerCase();
    if (!pattern) return clean;
    if (clean.startsWith("*") || clean.endsWith("*")) return clean;
    return `*${clean}*`;
  }

  function handleAdd() {
    const raw = buildRaw(newUsername, isPattern);
    if (!raw || raw === "*" || raw === "**") return;
    if (entries.some((e) => e.username === raw)) {
      showToast(`"${raw}" è già in lista.`, "error");
      return;
    }
    startTransition(async () => {
      const res = await addBlockedUsernameAction(raw);
      if ("success" in res) {
        setEntries((prev) => [{ username: raw, isPattern }, ...prev].sort((a, b) => a.username.localeCompare(b.username)));
        setNewUsername("");
        showToast((res as { success: string }).success, "success");
      } else if ("error" in res) {
        showToast((res as { error: string }).error, "error");
      }
    });
  }

  function handleRemove(username: string) {
    startTransition(async () => {
      const res = await removeBlockedUsernameAction(username);
      if ("success" in res) {
        setEntries((prev) => prev.filter((e) => e.username !== username));
        showToast((res as { success: string }).success, "success");
      } else if ("error" in res) {
        showToast((res as { error: string }).error, "error");
      }
    });
  }

  function handleBulk() {
    const lines = bulk
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l.length > 0 && !entries.some((e) => e.username === l));
    if (lines.length === 0) {
      showToast("Nessuna nuova voce da importare.", "error");
      return;
    }
    startBulkTransition(async () => {
      const res = await bulkImportBlockedUsernamesAction(lines);
      if ("success" in res) {
        const newEntries: Entry[] = lines.map((u) => ({
          username: u,
          isPattern: u.startsWith("*") || u.endsWith("*"),
        }));
        setEntries((prev) => [...prev, ...newEntries].sort((a, b) => a.username.localeCompare(b.username)));
        setBulk("");
        showToast((res as { success: string }).success, "success");
      } else if ("error" in res) {
        showToast((res as { error: string }).error, "error");
      }
    });
  }

  const patternBadgeStyle: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 600,
    padding: "1px 5px",
    borderRadius: "4px",
    background: "color-mix(in srgb, var(--admin-accent) 14%, transparent)",
    color: "var(--admin-accent)",
    border: "1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)",
    letterSpacing: "0.02em",
  };

  return (
    <>
      <div
        className="rounded-xl shadow-sm p-6 space-y-6"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}
      >
        {/* Aggiunta singola */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--admin-text)" }}>
            Aggiungi voce
          </h3>

          {/* Toggle pattern */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              role="switch"
              aria-checked={isPattern}
              onClick={() => setIsPattern((v) => !v)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
              style={{
                background: isPattern ? "var(--admin-accent)" : "var(--admin-input-border)",
              }}
            >
              <span
                className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                style={{ transform: isPattern ? "translateX(18px)" : "translateX(2px)" }}
              />
            </button>
            <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              Pattern wildcard
            </span>
            {isPattern && (
              <span className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
                — scrivi <code className="font-mono">admin</code> → salva come <code className="font-mono">*admin*</code>
              </span>
            )}
          </div>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
              placeholder={isPattern ? "es. admin  →  *admin*" : "es. amministratore"}
              className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none font-mono"
              style={{
                background: "var(--admin-page-bg)",
                border: "1px solid var(--admin-input-border)",
                color: "var(--admin-text)",
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !newUsername.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--admin-accent)" }}
              onMouseEnter={(e) =>
                !isPending && (e.currentTarget.style.background = "var(--admin-accent-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--admin-accent)")
              }
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Aggiungi
            </button>
          </div>

          {isPattern && (
            <p className="mt-2 text-[11px]" style={{ color: "var(--admin-text-faint)" }}>
              <code className="font-mono">*parola*</code> contiene &nbsp;·&nbsp;
              <code className="font-mono">parola*</code> inizia con &nbsp;·&nbsp;
              <code className="font-mono">*parola</code> finisce con
            </p>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--admin-card-border)" }} />

        {/* Import bulk */}
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--admin-text)" }}>
            Import bulk
          </h3>
          <p className="text-[11px] mb-3" style={{ color: "var(--admin-text-faint)" }}>
            Una voce per riga. I duplicati vengono ignorati. Usa <code className="font-mono">*parola*</code> per i pattern.
          </p>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder={"admin\n*amministrat*\nroot\n*superuser*"}
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
              onMouseEnter={(e) =>
                !isBulkPending && (e.currentTarget.style.background = "var(--admin-accent-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--admin-accent)")
              }
            >
              {isBulkPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {isBulkPending
                ? "Importazione..."
                : `Importa ${
                    bulk
                      .split("\n")
                      .filter((l) => l.trim() && !entries.some((e) => e.username === l.trim().toLowerCase()))
                      .length
                  } voci`}
            </button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--admin-card-border)" }} />

        {/* Lista */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
              Voci bloccate{" "}
              <span className="font-normal text-xs" style={{ color: "var(--admin-text-muted)" }}>
                ({entries.length})
              </span>
            </h3>
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--admin-text-faint)" }}
              />
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
              {search
                ? `Nessun risultato per "${search}"`
                : "Nessuna voce bloccata."}
            </p>
          ) : (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--admin-card-border)" }}
            >
              <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
                {filtered.map((entry, i) => (
                  <div
                    key={entry.username}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                    style={{
                      background:
                        i % 2 === 0
                          ? "var(--admin-card-bg)"
                          : "var(--admin-page-bg)",
                      borderBottom:
                        i < filtered.length - 1
                          ? "1px solid var(--admin-card-border)"
                          : "none",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--admin-text)" }}
                      >
                        {entry.username}
                      </span>
                      {entry.isPattern && (
                        <span style={patternBadgeStyle}>pattern</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry.username)}
                      disabled={isPending}
                      className="p-1 rounded transition-colors disabled:opacity-40"
                      title="Rimuovi"
                      style={{ color: "var(--admin-text-faint)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--admin-danger, #e53e3e)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--admin-text-faint)")
                      }
                    >
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
        <AdminToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
