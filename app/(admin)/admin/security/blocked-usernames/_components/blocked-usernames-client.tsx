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

export function BlockedUsernamesClient({
  initialUsernames,
}: {
  initialUsernames: string[];
}) {
  const [usernames, setUsernames] = useState<string[]>(initialUsernames);
  const [search, setSearch] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [bulk, setBulk] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isBulkPending, startBulkTransition] = useTransition();

  const filtered = search
    ? usernames.filter((u) => u.includes(search.toLowerCase().trim()))
    : usernames;

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
  }

  function handleAdd() {
    const username = newUsername.trim().toLowerCase();
    if (!username) return;
    if (usernames.includes(username)) {
      showToast(`"${username}" è già in lista.`, "error");
      return;
    }
    startTransition(async () => {
      const res = await addBlockedUsernameAction(username);
      if ("success" in res) {
        setUsernames((prev) => [username, ...prev].sort());
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
        setUsernames((prev) => prev.filter((u) => u !== username));
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
      .filter((l) => l.length > 0 && !usernames.includes(l));
    if (lines.length === 0) {
      showToast("Nessun nuovo username da importare.", "error");
      return;
    }
    startBulkTransition(async () => {
      const res = await bulkImportBlockedUsernamesAction(lines);
      if ("success" in res) {
        setUsernames((prev) => [...prev, ...lines].sort());
        setBulk("");
        showToast((res as { success: string }).success, "success");
      } else if ("error" in res) {
        showToast((res as { error: string }).error, "error");
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
        }}
      >
        {/* Aggiunta singola */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--admin-text)" }}>
            Aggiungi username
          </h3>
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
              placeholder="es. amministratore"
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
        </div>

        <div style={{ borderTop: "1px solid var(--admin-card-border)" }} />

        {/* Import bulk */}
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--admin-text)" }}>
            Import bulk
          </h3>
          <p className="text-[11px] mb-3" style={{ color: "var(--admin-text-faint)" }}>
            Un username per riga. I duplicati vengono ignorati.
          </p>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder={"admin\nroot\nsuperuser\nmoderatore"}
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
                      .filter((l) => l.trim() && !usernames.includes(l.trim().toLowerCase()))
                      .length
                  } username`}
            </button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--admin-card-border)" }} />

        {/* Lista */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
              Username bloccati{" "}
              <span className="font-normal text-xs" style={{ color: "var(--admin-text-muted)" }}>
                ({usernames.length})
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
                : "Nessun username bloccato."}
            </p>
          ) : (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--admin-card-border)" }}
            >
              <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
                {filtered.map((username, i) => (
                  <div
                    key={username}
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
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--admin-text)" }}
                    >
                      {username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(username)}
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
