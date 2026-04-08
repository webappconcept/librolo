// app/(admin)/admin/settings/tabs/routes-tab.tsx
import {
  ADMIN_ROUTES,
  ADMIN_SIGNIN_ROUTE,
  AUTH_ROUTES,
  FOOTER_LINKS,
  NAV_ITEMS,
  PUBLIC_ROUTES,
  USER_MENU_ITEMS,
} from "@/lib/routes";
import { ExternalLink, FileCode2, Info, Lock, Unlock } from "lucide-react";

// Deve essere allineato con PRIVATE_ROUTE_PREFIXES in proxy.ts
const PRIVATE_ROUTE_PREFIXES = [
  "/dashboard",
  "/profilo",
  "/account",
  "/libreria",
  "/esplora",
  "/assistenza",
  "/segnala",
];

type RouteEntry = {
  path: string;
  label: string;
  type: "public" | "auth" | "private" | "admin";
  source: string;
};

function classifyRoute(path: string): RouteEntry["type"] {
  if (path === ADMIN_SIGNIN_ROUTE || ADMIN_ROUTES.some((r) => path === r || path.startsWith(r + "/"))) return "admin";
  if (AUTH_ROUTES.some((r) => path === r || path.startsWith(r + "/"))) return "auth";
  if (PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + "/"))) return "public";
  if (PRIVATE_ROUTE_PREFIXES.some((r) => path === r || path.startsWith(r + "/"))) return "private";
  return "public";
}

function buildRoutes(): RouteEntry[] {
  const map = new Map<string, RouteEntry>();

  const add = (path: string, label: string, source: string) => {
    if (!map.has(path)) {
      map.set(path, { path, label, type: classifyRoute(path), source });
    }
  };

  // Nav principale
  NAV_ITEMS.forEach((item) => add(item.href, item.label, "NAV_ITEMS"));
  // Menu utente
  USER_MENU_ITEMS.forEach((item) => add(item.href, item.label, "USER_MENU_ITEMS"));
  // Footer
  FOOTER_LINKS.forEach((item) => add(item.href, item.label, "FOOTER_LINKS"));
  // Route pubbliche/auth da PUBLIC_ROUTES
  PUBLIC_ROUTES.forEach((r) => add(r, r, "PUBLIC_ROUTES"));
  // Route admin
  ADMIN_ROUTES.forEach((r) => add(r, "Pannello Admin", "ADMIN_ROUTES"));
  add(ADMIN_SIGNIN_ROUTE, "Admin Sign-in", "ADMIN_SIGNIN_ROUTE");
  // Route private (solo quelle non già aggiunte da NAV/USER_MENU)
  PRIVATE_ROUTE_PREFIXES.forEach((r) => add(r, r, "proxy.ts → PRIVATE_ROUTE_PREFIXES"));

  return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
}

const TYPE_CONFIG: Record<RouteEntry["type"], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  public: {
    label: "Pubblica",
    color: "#16a34a",
    bg: "#f0fdf4",
    icon: <Unlock size={12} />,
  },
  auth: {
    label: "Solo ospiti",
    color: "#2563eb",
    bg: "#eff6ff",
    icon: <Unlock size={12} />,
  },
  private: {
    label: "Richiede login",
    color: "#d97706",
    bg: "#fffbeb",
    icon: <Lock size={12} />,
  },
  admin: {
    label: "Solo admin",
    color: "#dc2626",
    bg: "#fef2f2",
    icon: <Lock size={12} />,
  },
};

export function RoutesTab() {
  const routes = buildRoutes();

  const counts = routes.reduce(
    (acc, r) => { acc[r.type] = (acc[r.type] ?? 0) + 1; return acc; },
    {} as Record<RouteEntry["type"], number>,
  );

  return (
    <div className="space-y-5">
      {/* Banner info */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <Info size={15} className="mt-0.5 shrink-0" style={{ color: "#2563eb" }} />
        <p className="text-sm" style={{ color: "#1d4ed8" }}>
          Questa vista è <strong>sola lettura</strong> e riflette la configurazione nei file statici.
          Per modificare le protezioni edita{" "}
          <code className="font-mono text-xs bg-blue-100 px-1 py-0.5 rounded">proxy.ts → PRIVATE_ROUTE_PREFIXES</code>{" "}
          e{" "}
          <code className="font-mono text-xs bg-blue-100 px-1 py-0.5 rounded">lib/routes.ts</code>.
        </p>
      </div>

      {/* Contatori */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(TYPE_CONFIG) as [RouteEntry["type"], typeof TYPE_CONFIG[RouteEntry["type"]]][]).map(([type, cfg]) => (
          <div
            key={type}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: cfg.bg, border: `1px solid ${cfg.color}22` }}>
            <span style={{ color: cfg.color }}>{cfg.icon}</span>
            <div>
              <p className="text-xl font-bold" style={{ color: cfg.color }}>{counts[type] ?? 0}</p>
              <p className="text-xs" style={{ color: cfg.color, opacity: 0.8 }}>{cfg.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabella route */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--admin-card-border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--admin-card-bg)", borderBottom: "1px solid var(--admin-card-border)" }}>
              <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>Percorso</th>
              <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell" style={{ color: "var(--admin-text-muted)" }}>Etichetta</th>
              <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>Accesso</th>
              <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide hidden md:table-cell" style={{ color: "var(--admin-text-muted)" }}>Sorgente</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route, i) => {
              const cfg = TYPE_CONFIG[route.type];
              return (
                <tr
                  key={route.path}
                  style={{
                    background: i % 2 === 0 ? "var(--admin-bg)" : "var(--admin-card-bg)",
                    borderBottom: "1px solid var(--admin-card-border)",
                  }}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs" style={{ color: "var(--admin-text)" }}>{route.path}</code>
                      <a
                        href={route.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Apri in nuova scheda"
                        className="opacity-30 hover:opacity-70 transition-opacity">
                        <ExternalLink size={11} style={{ color: "var(--admin-text-muted)" }} />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell" style={{ color: "var(--admin-text-muted)" }}>
                    <span className="text-xs">{route.label}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <FileCode2 size={11} style={{ color: "var(--admin-text-muted)" }} />
                      <code className="text-xs" style={{ color: "var(--admin-text-muted)" }}>{route.source}</code>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
