// app/(admin)/admin/_components/recent-activity.tsx
import {
  ArrowRight,
  FileText,
  KeyRound,
  LogIn,
  LogOut,
  PanelTop,
  ShieldAlert,
  Trash2,
  UserCog,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

interface ActivityLog {
  id: number;
  action: string;
  userEmail: string | null;
  timestamp: Date;
}

interface RecentActivityProps {
  logs: ActivityLog[];
}

function getActionMeta(action: string): { label: string; icon: React.ElementType; color: string } {
  const base = action.split(" | ")[0];
  if (base === "SIGN_IN") return { label: "Accesso", icon: LogIn, color: "#22c55e" };
  if (base === "SIGN_UP") return { label: "Registrazione", icon: UserPlus, color: "#38bdf8" };
  if (base === "SIGN_OUT") return { label: "Uscita", icon: LogOut, color: "#94a3b8" };
  if (base === "ADMIN_BAN_USER") return { label: "Utente bannato", icon: ShieldAlert, color: "#f87171" };
  if (base === "ADMIN_UNBAN_USER") return { label: "Ban rimosso", icon: ShieldAlert, color: "#22c55e" };
  if (base === "ADMIN_DELETE_USER") return { label: "Utente eliminato", icon: Trash2, color: "#f87171" };
  if (base === "ADMIN_CHANGE_ROLE") return { label: "Ruolo modificato", icon: UserCog, color: "#a78bfa" };
  if (base.startsWith("PERMISSION")) return { label: "Permesso", icon: KeyRound, color: "#fbbf24" };
  if (base.startsWith("ROLE_")) return { label: "Ruolo", icon: KeyRound, color: "#a78bfa" };
  if (base.startsWith("PAGE_")) return { label: "Pagina", icon: FileText, color: "#38bdf8" };
  if (base.startsWith("TEMPLATE_")) return { label: "Template", icon: PanelTop, color: "#f472b6" };
  return { label: base.replace(/_/g, " "), icon: ArrowRight, color: "var(--admin-text-muted)" };
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins}m fa`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h fa`;
  return `${Math.floor(hrs / 24)}g fa`;
}

export function RecentActivity({ logs }: RecentActivityProps) {
  if (!logs.length) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
          Nessuna attività recente.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl shadow-sm"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px solid var(--admin-card-border)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--admin-divider)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
          Attività recente
        </h3>
        <Link
          href="/admin/logs"
          className="flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
          style={{ color: "var(--admin-accent)" }}
        >
          Vedi tutti
          <ArrowRight size={12} />
        </Link>
      </div>

      <ul className="divide-y" style={{ borderColor: "var(--admin-divider)" }}>
        {logs.map((log) => {
          const meta = getActionMeta(log.action);
          const Icon = meta.icon;
          return (
            <li key={log.id} className="flex items-center gap-3 px-5 py-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `color-mix(in oklch, ${meta.color} 12%, transparent)`,
                }}
              >
                <Icon size={15} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--admin-text)" }}
                >
                  {meta.label}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  {log.userEmail ?? "Utente sconosciuto"}
                </p>
              </div>
              <span
                className="text-xs shrink-0"
                style={{ color: "var(--admin-text-faint)" }}
              >
                {timeAgo(log.timestamp)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
