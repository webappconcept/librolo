// app/(admin)/admin/logs/_components/logs-client.tsx
"use client";

import { useState, useMemo } from "react";
import { ActivityType } from "@/lib/db/schema";
import {
  Activity,
  Filter,
  KeyRound,
  LogIn,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCog,
} from "lucide-react";

type LogEntry = {
  id: number;
  userId: number | null;
  userEmail: string | null;
  action: string;
  ipAddress: string | null;
  timestamp: Date;
};

type Props = { logs: LogEntry[] };

// --- Tabs disponibili (aggiungere qui i futuri tab) ---
const TABS = [
  { id: "rbac", label: "RBAC", icon: KeyRound },
  { id: "auth", label: "Autenticazione", icon: LogIn },
  { id: "all", label: "Tutti", icon: Activity },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Prefissi ActivityType per categoria
const RBAC_TYPES = new Set([
  ActivityType.PERMISSION_GRANTED,
  ActivityType.PERMISSION_REVOKED,
  ActivityType.ROLE_PERMISSION_ADDED,
  ActivityType.ROLE_PERMISSION_REMOVED,
  ActivityType.ADMIN_CHANGE_ROLE,
  ActivityType.ADMIN_BAN_USER,
  ActivityType.ADMIN_UNBAN_USER,
  ActivityType.ADMIN_DELETE_USER,
]);

const AUTH_TYPES = new Set([
  ActivityType.SIGN_IN,
  ActivityType.SIGN_UP,
  ActivityType.SIGN_OUT,
  ActivityType.UPDATE_PASSWORD,
  ActivityType.PASSWORD_RESET_REQUESTED,
  ActivityType.PASSWORD_RESET_COMPLETED,
  ActivityType.EMAIL_VERIFIED,
]);

function getActionType(action: string): ActivityType | null {
  // Il formato è "ACTIVITY_TYPE | detail" oppure solo "ACTIVITY_TYPE"
  const part = action.split(" | ")[0].trim() as ActivityType;
  return Object.values(ActivityType).includes(part) ? part : null;
}

function getDetail(action: string): string {
  const parts = action.split(" | ");
  return parts.length > 1 ? parts.slice(1).join(" | ") : "";
}

function ActionIcon({ type }: { type: ActivityType | null }) {
  if (!type) return <Activity size={13} />;
  if (type === ActivityType.PERMISSION_GRANTED || type === ActivityType.ROLE_PERMISSION_ADDED)
    return <ShieldCheck size={13} style={{ color: "#16a34a" }} />;
  if (type === ActivityType.PERMISSION_REVOKED || type === ActivityType.ROLE_PERMISSION_REMOVED)
    return <ShieldOff size={13} style={{ color: "#dc2626" }} />;
  if (type === ActivityType.ADMIN_CHANGE_ROLE) return <UserCog size={13} style={{ color: "#7c3aed" }} />;
  if (type === ActivityType.ADMIN_BAN_USER || type === ActivityType.ADMIN_DELETE_USER)
    return <Trash2 size={13} style={{ color: "#dc2626" }} />;
  if (type === ActivityType.ADMIN_UNBAN_USER) return <Shield size={13} style={{ color: "#16a34a" }} />;
  if (AUTH_TYPES.has(type)) return <LogIn size={13} style={{ color: "#0284c7" }} />;
  return <Activity size={13} />;
}

function TypeBadge({ type }: { type: ActivityType | null }) {
  if (!type) return null;
  const label = type.replace(/_/g, " ");
  let bg = "var(--admin-hover-bg)";
  let color = "var(--admin-text-muted)";
  if (type === ActivityType.PERMISSION_GRANTED || type === ActivityType.ROLE_PERMISSION_ADDED) {
    bg = "#dcfce7"; color = "#15803d";
  } else if (type === ActivityType.PERMISSION_REVOKED || type === ActivityType.ROLE_PERMISSION_REMOVED) {
    bg = "#fef2f2"; color = "#dc2626";
  } else if (type === ActivityType.ADMIN_CHANGE_ROLE) {
    bg = "#f3e8ff"; color = "#7c3aed";
  } else if (type === ActivityType.ADMIN_BAN_USER || type === ActivityType.ADMIN_DELETE_USER) {
    bg = "#fef2f2"; color = "#b91c1c";
  } else if (type === ActivityType.ADMIN_UNBAN_USER) {
    bg = "#dcfce7"; color = "#166534";
  } else if (AUTH_TYPES.has(type)) {
    bg = "#e0f2fe"; color = "#0369a1";
  }
  return (
    <span
      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: bg, color }}>
      {label}
    </span>
  );
}

export function LogsClient({ logs }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("rbac");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let entries = logs;

    // Filtra per tab
    if (activeTab === "rbac") {
      entries = entries.filter((l) => {
        const t = getActionType(l.action);
        return t && RBAC_TYPES.has(t);
      });
    } else if (activeTab === "auth") {
      entries = entries.filter((l) => {
        const t = getActionType(l.action);
        return t && AUTH_TYPES.has(t);
      });
    }

    // Filtra per ricerca
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          (l.userEmail ?? "").toLowerCase().includes(q) ||
          (l.ipAddress ?? "").includes(q),
      );
    }

    return entries;
  }, [logs, activeTab, search]);

  return (
    <div className="space-y-4">
      {/* Tab bar + ricerca */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          className="flex items-center gap-1 p-1 rounded-xl w-fit"
          style={{ background: "var(--admin-hover-bg)" }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            // Conta per tab
            const count =
              tab.id === "rbac"
                ? logs.filter((l) => { const t = getActionType(l.action); return t && RBAC_TYPES.has(t); }).length
                : tab.id === "auth"
                ? logs.filter((l) => { const t = getActionType(l.action); return t && AUTH_TYPES.has(t); }).length
                : logs.length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
                style={{
                  background: isActive ? "var(--admin-accent)" : "transparent",
                  color: isActive ? "#fff" : "var(--admin-text-muted)",
                  boxShadow: isActive ? "0 1px 3px oklch(0 0 0 / 0.15)" : "none",
                }}>
                <Icon size={13} />
                {tab.label}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.25)" : "var(--admin-card-border)",
                    color: isActive ? "#fff" : "var(--admin-text-faint)",
                  }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ricerca */}
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--admin-text-faint)" }}
          />
          <input
            type="text"
            placeholder="Cerca azione, email, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm rounded-lg outline-none border w-64"
            style={{
              background: "var(--admin-bg)",
              borderColor: "var(--admin-card-border)",
              color: "var(--admin-text)",
            }}
          />
        </div>
      </div>

      {/* Filtro attivo info */}
      {search && (
        <div className="flex items-center gap-2">
          <Filter size={12} style={{ color: "var(--admin-text-faint)" }} />
          <span className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
            {filtered.length} risultati per &ldquo;{search}&rdquo;
          </span>
          <button
            onClick={() => setSearch("")}
            className="text-xs underline"
            style={{ color: "var(--admin-accent)" }}>
            Cancella
          </button>
        </div>
      )}

      {/* Lista log */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--admin-card-border)" }}>
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-2"
            style={{ background: "var(--admin-card-bg)" }}>
            <Activity size={28} style={{ opacity: 0.2, color: "var(--admin-text)" }} />
            <p className="text-sm" style={{ color: "var(--admin-text-faint)" }}>
              Nessun log trovato
            </p>
          </div>
        ) : (
          <div style={{ background: "var(--admin-card-bg)" }}>
            {filtered.map((log, i) => {
              const type = getActionType(log.action);
              const detail = getDetail(log.action);
              const isLast = i === filtered.length - 1;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{
                    borderBottom: isLast ? "none" : "1px solid var(--admin-card-border)",
                  }}>
                  {/* Icona */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "var(--admin-hover-bg)" }}>
                    <ActionIcon type={type} />
                  </div>

                  {/* Contenuto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={type} />
                      {detail && (
                        <code
                          className="text-[11px] font-mono truncate max-w-[400px]"
                          style={{ color: "var(--admin-text-muted)" }}
                          title={detail}>
                          {detail}
                        </code>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {log.userEmail && (
                        <span className="text-[11px]" style={{ color: "var(--admin-text-faint)" }}>
                          {log.userEmail}
                        </span>
                      )}
                      {log.ipAddress && (
                        <span
                          className="text-[11px] font-mono"
                          style={{ color: "var(--admin-text-faint)" }}>
                          {log.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <time
                    className="text-[11px] shrink-0 tabular-nums"
                    style={{ color: "var(--admin-text-faint)" }}
                    title={new Date(log.timestamp).toISOString()}>
                    {new Date(log.timestamp).toLocaleString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-right" style={{ color: "var(--admin-text-faint)" }}>
        Ultimi {logs.length} eventi • ordinati dal più recente
      </p>
    </div>
  );
}
