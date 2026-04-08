// app/(admin)/admin/permissions/_components/permissions-manager.tsx
"use client";

import type { Permission } from "@/lib/db/schema";
import type { RoleRow } from "@/lib/db/roles-queries";
import {
  SYSTEM_PERMISSIONS,
  groupedSystemPermissions,
  type SystemPermission,
} from "@/lib/rbac/system-permissions";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  LayoutGrid,
  Lock,
  Plus,
  Search,
  Table2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useTransition, useState, useMemo, useEffect } from "react";
import {
  createPermission,
  deletePermission,
  fetchUsersWithPermission,
  getPermissionImpact,
  toggleRolePermission,
} from "../actions";

type Props = {
  permissions: Permission[];
  roles: RoleRow[];
  rolePermsMap: Record<number, number[]>;
};

// ─── Tab bar ────────────────────────────────────────────────────────────────
const PERMISSION_TABS = [
  { id: "catalog" as const, label: "Catalogo permessi", icon: LayoutGrid },
  { id: "matrix" as const, label: "Matrice ruoli", icon: Table2 },
] as const;

function TabBar({
  active,
  onChange,
}: {
  active: "matrix" | "catalog";
  onChange: (t: "matrix" | "catalog") => void;
}) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl w-fit"
      style={{
        background: "var(--admin-card-bg)",
        border: "1px solid var(--admin-card-border)",
      }}>
      {PERMISSION_TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
            style={{
              background: isActive ? "var(--admin-accent)" : "transparent",
              color: isActive ? "#fff" : "var(--admin-text-muted)",
            }}>
            <Icon size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Lock icon ──────────────────────────────────────────────────────────────
function SystemLockIcon() {
  return (
    <span title="Permesso di sistema" style={{ display: "inline-flex" }}>
      <Lock size={10} style={{ color: "var(--admin-text-faint)" }} />
    </span>
  );
}

// ─── Group card header condiviso ─────────────────────────────────────────────
function GroupHeader({
  group,
  count,
  isExpanded,
  onToggle,
}: {
  group: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-3"
      style={{ background: "var(--admin-hover-bg)" }}>
      {isExpanded ? (
        <ChevronDown size={13} style={{ color: "var(--admin-text-faint)" }} />
      ) : (
        <ChevronRight size={13} style={{ color: "var(--admin-text-faint)" }} />
      )}
      <span
        className="text-xs font-bold uppercase tracking-widest flex-1 text-left"
        style={{ color: "var(--admin-text-muted)" }}>
        {group}
      </span>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: "var(--admin-card-border)", color: "var(--admin-text-faint)" }}>
        {count}
      </span>
    </button>
  );
}

// ─── Legenda permessi di sistema ─────────────────────────────────────────────
function SystemPermissionsLegend() {
  const [open, setOpen] = useState(false);
  const grouped = useMemo(() => groupedSystemPermissions(), []);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid oklch(0 0 0 / 0.13)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors"
        style={{ background: "var(--admin-hover-bg)" }}>
        <HelpCircle size={14} style={{ color: "var(--admin-accent)" }} />
        <span className="text-xs font-semibold flex-1" style={{ color: "var(--admin-text)" }}>
          Chiavi di sistema disponibili
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded mr-2"
          style={{ background: "var(--admin-card-border)", color: "var(--admin-text-faint)" }}>
          {SYSTEM_PERMISSIONS.length} chiavi
        </span>
        {open ? (
          <ChevronDown size={13} style={{ color: "var(--admin-text-faint)" }} />
        ) : (
          <ChevronRight size={13} style={{ color: "var(--admin-text-faint)" }} />
        )}
      </button>

      {open && (
        <div className="divide-y" style={{ borderTop: "1px solid var(--admin-card-border)" }}>
          {Array.from(grouped.entries()).map(([group, perms]) => (
            <div key={group}>
              <div
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
                style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-faint)" }}>
                {group}
              </div>
              {perms.map((p) => (
                <div
                  key={p.key}
                  className="flex items-start gap-3 px-4 py-2"
                  style={{ borderTop: "1px solid var(--admin-card-border)" }}>
                  <code className="font-mono text-[11px] shrink-0 mt-0.5" style={{ color: "var(--admin-accent)" }}>
                    {p.key}
                  </code>
                  <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                    {p.description}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Matrice ruoli ──────────────────────────────────────────────────────────
function PermissionsMatrix({ permissions, roles, rolePermsMap }: Props) {
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const filtered = permissions.filter(
      (p) =>
        search.trim() === "" ||
        p.key.toLowerCase().includes(search.toLowerCase()) ||
        p.label.toLowerCase().includes(search.toLowerCase()),
    );
    const map = new Map<string, Permission[]>();
    for (const p of filtered) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return map;
  }, [permissions, search]);

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  function handleToggle(roleId: number, permId: number, granted: boolean) {
    const key = `${roleId}-${permId}`;
    setTogglingKey(key);
    startTransition(async () => {
      await toggleRolePermission(roleId, permId, !granted);
      setTogglingKey(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--admin-text-faint)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtra permessi..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none border"
          style={{ background: "var(--admin-bg)", borderColor: "var(--admin-card-border)", color: "var(--admin-text)" }}
        />
      </div>

      {Array.from(groups.entries()).map(([group, perms]) => {
        const isExpanded = expandedGroups.has(group);
        return (
          <div key={group} className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0 0 0 / 0.13)" }}>
            <GroupHeader
              group={group}
              count={perms.length}
              isExpanded={isExpanded}
              onToggle={() => toggleGroup(group)}
            />

            {isExpanded &&
              perms.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: "1px solid var(--admin-card-border)", background: "var(--admin-bg)" }}>
                  {/* Info permesso */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-[11px]" style={{ color: "var(--admin-text)" }}>{perm.key}</code>
                      {perm.isSystem && <SystemLockIcon />}
                    </div>
                    <p className="text-[11px] truncate" style={{ color: "var(--admin-text-faint)" }}>{perm.label}</p>
                  </div>

                  {/* Colonne ruoli */}
                  {roles.map((role) => {
                    const granted = (rolePermsMap[role.id] ?? []).includes(perm.id);
                    const isPending = togglingKey === `${role.id}-${perm.id}`;
                    return (
                      <div key={role.id} className="flex flex-col items-center gap-1" style={{ minWidth: 64 }}>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wide"
                          style={{ color: role.color, opacity: 0.85 }}>
                          {role.label}
                        </span>
                        <button
                          onClick={() => handleToggle(role.id, perm.id, granted)}
                          disabled={isPending || pending}
                          title={granted ? `Rimuovi da ${role.label}` : `Assegna a ${role.label}`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all border-2 disabled:opacity-50"
                          style={{
                            background: granted ? role.color + "18" : "oklch(0 0 0 / 0.04)",
                            borderColor: granted ? role.color + "80" : "oklch(0 0 0 / 0.18)",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            if (!granted) {
                              e.currentTarget.style.background = role.color + "14";
                              e.currentTarget.style.borderColor = role.color + "70";
                            } else {
                              e.currentTarget.style.background = role.color + "30";
                              e.currentTarget.style.borderColor = role.color;
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = granted ? role.color + "18" : "oklch(0 0 0 / 0.04)";
                            e.currentTarget.style.borderColor = granted ? role.color + "80" : "oklch(0 0 0 / 0.18)";
                          }}>
                          {isPending ? (
                            <div
                              className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                              style={{ borderColor: role.color, borderTopColor: "transparent" }}
                            />
                          ) : granted ? (
                            <Check size={14} style={{ color: role.color }} />
                          ) : (
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                border: "2px dashed oklch(0 0 0 / 0.28)",
                              }}
                            />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Drawer "Chi ha questo permesso?" ────────────────────────────────────────
type UserWithPermission = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  source: string;
};

type DrawerData = {
  users: UserWithPermission[];
  truncated: boolean;
  limit: number;
};

function UsersDrawer({
  permKey,
  permLabel,
  onClose,
}: {
  permKey: string;
  permLabel: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSearch("");
    fetchUsersWithPermission(permKey).then((result) => {
      if (!cancelled) {
        setData(result as DrawerData);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [permKey]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.firstName ?? "").toLowerCase().includes(q) ||
        (u.lastName ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div
        className="w-full sm:w-[420px] h-full flex flex-col"
        style={{
          background: "var(--admin-card-bg)",
          borderLeft: "1px solid var(--admin-card-border)",
          boxShadow: "-12px 0 40px oklch(0 0 0 / 0.18)",
        }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--admin-card-border)" }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--admin-hover-bg)" }}>
            <Users size={15} style={{ color: "var(--admin-accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
              Chi ha questo permesso?
            </p>
            <code className="text-[11px] font-mono" style={{ color: "var(--admin-text-muted)" }}>
              {permKey}
            </code>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--admin-hover-bg)]"
            style={{ color: "var(--admin-text-faint)" }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Barra ricerca + contatore ────────────────────────────────────── */}
        {!loading && data && (
          <div
            className="px-4 pt-3 pb-2 shrink-0 space-y-2"
            style={{ borderBottom: "1px solid var(--admin-card-border)" }}>
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--admin-text-faint)" }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca per nome o email..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none border"
                style={{
                  background: "var(--admin-bg)",
                  borderColor: "var(--admin-card-border)",
                  color: "var(--admin-text)",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--admin-text-faint)" }}>
                  <X size={11} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[11px]" style={{ color: "var(--admin-text-faint)" }}>
                {search
                  ? `${filtered.length} di ${data.users.length} utenti`
                  : `${data.users.length} ${data.users.length === 1 ? "utente" : "utenti"}`}
              </p>
              {data.truncated && (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>
                  Mostra primi {data.limit}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Corpo ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--admin-accent)", borderTopColor: "transparent" }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users size={28} style={{ color: "var(--admin-text-faint)" }} className="mb-3" />
              <p className="text-sm font-medium" style={{ color: "var(--admin-text-muted)" }}>
                {search ? "Nessun risultato" : "Nessun utente"}
              </p>
              <p className="text-xs mt-1 max-w-[220px]" style={{ color: "var(--admin-text-faint)" }}>
                {search
                  ? `Nessun utente corrisponde a "${search}"`
                  : `Nessuno ha ancora il permesso`}
              </p>
            </div>
          ) : (
            filtered.map((u) => {
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
              const initials =
                [u.firstName?.[0], u.lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
                u.email[0].toUpperCase();
              const isViaOverride = u.source === "override" || u.source === "'override'";
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "var(--admin-hover-bg)" }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: "var(--admin-card-border)",
                      color: "var(--admin-text-muted)",
                    }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--admin-text)" }}>
                      {name}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: "var(--admin-text-faint)" }}>
                      {u.email}
                    </p>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: "var(--admin-text-faint)" }}>
                    {u.role}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: isViaOverride ? "#fffbeb" : "#f0fdf4",
                      color: isViaOverride ? "#b45309" : "#16a34a",
                      border: isViaOverride ? "1px solid #fde68a" : "1px solid #bbf7d0",
                    }}>
                    {isViaOverride ? "override" : "ruolo"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer permesso ────────────────────────────────────────────────── */}
        {!loading && data && data.users.length > 0 && (
          <div
            className="px-5 py-3 shrink-0 text-xs truncate"
            style={{
              borderTop: "1px solid var(--admin-card-border)",
              color: "var(--admin-text-faint)",
            }}>
            {permLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dialog conferma eliminazione ────────────────────────────────────────────
type ImpactData = {
  id: number;
  key: string;
  label: string;
  roleAssignments: number;
  userOverrides: number;
};

function DeleteConfirmDialog({
  impact,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  impact: ImpactData;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  const hasImpact = impact.roleAssignments > 0 || impact.userOverrides > 0;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
          boxShadow: "0 24px 48px oklch(0 0 0 / 0.35)",
        }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
            <AlertTriangle size={18} style={{ color: "#dc2626" }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--admin-text)" }}>Elimina permesso</h3>
            <code className="font-mono text-xs" style={{ color: "var(--admin-text-muted)" }}>{impact.key}</code>
          </div>
          <button onClick={onCancel} className="ml-auto p-1 rounded-lg transition-colors" style={{ color: "var(--admin-text-faint)" }}>
            <X size={15} />
          </button>
        </div>

        {hasImpact ? (
          <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <p className="text-xs font-semibold" style={{ color: "#92400e" }}>⚠️ Questo permesso ha assegnazioni attive:</p>
            <ul className="space-y-1">
              {impact.roleAssignments > 0 && (
                <li className="text-xs" style={{ color: "#b45309" }}>
                  • <strong>{impact.roleAssignments}</strong> {impact.roleAssignments === 1 ? "ruolo" : "ruoli"} con questo permesso
                </li>
              )}
              {impact.userOverrides > 0 && (
                <li className="text-xs" style={{ color: "#b45309" }}>
                  • <strong>{impact.userOverrides}</strong> override {impact.userOverrides === 1 ? "individuale" : "individuali"} su utenti
                </li>
              )}
            </ul>
            <p className="text-xs" style={{ color: "#92400e" }}>Tutte queste assegnazioni verranno rimosse automaticamente.</p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
            Il permesso <strong style={{ color: "var(--admin-text)" }}>{impact.label}</strong> non ha assegnazioni attive. Verrà eliminato definitivamente.
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-colors"
            style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}>
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-colors disabled:opacity-60"
            style={{ background: "#dc2626", color: "#fff" }}>
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            {isDeleting ? "Eliminazione..." : "Elimina definitivamente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Catalogo permessi ────────────────────────────────────────────────────────
function PermissionsCatalog({ permissions, roles, rolePermsMap }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [confirmImpact, setConfirmImpact] = useState<ImpactData | null>(null);
  const [loadingImpactId, setLoadingImpactId] = useState<number | null>(null);
  const [usersDrawer, setUsersDrawer] = useState<{ key: string; label: string } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  const suggested = useMemo<SystemPermission | undefined>(
    () => SYSTEM_PERMISSIONS.find((p) => p.key === keyValue),
    [keyValue],
  );

  const permToRoles = useMemo(() => {
    const map = new Map<number, RoleRow[]>();
    for (const [roleIdStr, permIds] of Object.entries(rolePermsMap)) {
      const role = roles.find((r) => r.id === Number(roleIdStr));
      if (!role) continue;
      for (const pid of permIds) {
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push(role);
      }
    }
    return map;
  }, [roles, rolePermsMap]);

  const groups = useMemo(() => {
    const filtered = permissions.filter(
      (p) =>
        search.trim() === "" ||
        p.key.toLowerCase().includes(search.toLowerCase()) ||
        p.label.toLowerCase().includes(search.toLowerCase()),
    );
    const map = new Map<string, Permission[]>();
    for (const p of filtered) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return map;
  }, [permissions, search]);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createPermission(fd);
      if (res?.error) {
        setFormError(res.error);
      } else {
        setShowCreate(false);
        setKeyValue("");
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  function handleDeleteRequest(perm: Permission) {
    setLoadingImpactId(perm.id);
    startTransition(async () => {
      const res = await getPermissionImpact(perm.id);
      setLoadingImpactId(null);
      if ("error" in res) return;
      setConfirmImpact({
        id: perm.id,
        key: res.key!,
        label: res.label!,
        roleAssignments: res.roleAssignments!,
        userOverrides: res.userOverrides!,
      });
    });
  }

  function handleDeleteConfirm() {
    if (!confirmImpact) return;
    setDeletingId(confirmImpact.id);
    startTransition(async () => {
      await deletePermission(confirmImpact.id);
      setDeletingId(null);
      setConfirmImpact(null);
    });
  }

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg outline-none border focus:ring-2";
  const inputStyle = {
    background: "var(--admin-bg)",
    borderColor: "var(--admin-card-border)",
    color: "var(--admin-text)",
  };
  const datalistId = "system-permissions-datalist";

  return (
    <div className="space-y-4">
      {usersDrawer && (
        <UsersDrawer
          permKey={usersDrawer.key}
          permLabel={usersDrawer.label}
          onClose={() => setUsersDrawer(null)}
        />
      )}

      {confirmImpact && (
        <DeleteConfirmDialog
          impact={confirmImpact}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmImpact(null)}
          isDeleting={deletingId === confirmImpact.id}
        />
      )}

      <SystemPermissionsLegend />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--admin-text-faint)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtra permessi..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none border"
            style={{ background: "var(--admin-bg)", borderColor: "var(--admin-card-border)", color: "var(--admin-text)" }}
          />
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium transition-colors"
          style={{ background: "var(--admin-accent)", color: "#fff" }}>
          <Plus size={14} />
          Nuovo
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--admin-card-bg)", border: "1px solid oklch(0 0 0 / 0.13)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>Nuovo permesso</p>
          <datalist id={datalistId}>
            {SYSTEM_PERMISSIONS.map((p) => (
              <option key={p.key} value={p.key} label={p.description} />
            ))}
          </datalist>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--admin-text-muted)" }}>Chiave *</label>
              <input name="key" list={datalistId} required placeholder="risorsa:azione" className={inputCls} style={inputStyle} value={keyValue} onChange={(e) => setKeyValue(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--admin-text-muted)" }}>Etichetta *</label>
              <input name="label" required placeholder="Es. Pubblica articoli" className={inputCls} style={inputStyle} defaultValue={suggested?.description ?? ""} key={suggested?.key ?? "custom"} />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--admin-text-muted)" }}>Gruppo *</label>
              <input name="group" required placeholder="Es. Contenuti" className={inputCls} style={inputStyle} defaultValue={suggested?.group ?? ""} key={(suggested?.key ?? "custom") + "-group"} />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "var(--admin-text-muted)" }}>Descrizione</label>
              <input name="description" placeholder="Opzionale" className={inputCls} style={inputStyle} />
            </div>
          </div>
          {formError && <p className="text-xs" style={{ color: "#dc2626" }}>{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowCreate(false); setFormError(null); }} className="px-3 py-1.5 text-sm rounded-lg transition-colors" style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}>Annulla</button>
            <button type="submit" disabled={pending} className="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-60" style={{ background: "var(--admin-accent)", color: "#fff" }}>{pending ? "Salvataggio..." : "Salva"}</button>
          </div>
        </form>
      )}

      {Array.from(groups.entries()).map(([group, perms]) => {
        const isExpanded = expandedGroups.has(group);
        return (
          <div key={group} className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0 0 0 / 0.13)" }}>
            <GroupHeader
              group={group}
              count={perms.length}
              isExpanded={isExpanded}
              onToggle={() => toggleGroup(group)}
            />

            {isExpanded && perms.map((perm) => {
              const assignedRoles = permToRoles.get(perm.id) ?? [];
              const isLoadingThis = loadingImpactId === perm.id;
              return (
                <div
                  key={perm.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: "1px solid var(--admin-card-border)", background: "var(--admin-bg)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-[11px]" style={{ color: "var(--admin-text)" }}>{perm.key}</code>
                      {perm.isSystem && <SystemLockIcon />}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--admin-text-muted)" }}>{perm.label}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {assignedRoles.length === 0 ? (
                      <span className="text-[10px]" style={{ color: "var(--admin-text-faint)" }}>Nessun ruolo</span>
                    ) : (
                      assignedRoles.map((r) => (
                        <span
                          key={r.id}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: r.color + "18", color: r.color, border: `1px solid ${r.color}40` }}>
                          {r.label}
                        </span>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setUsersDrawer({ key: perm.key, label: perm.label })}
                    className="p-1.5 rounded-lg transition-colors shrink-0"
                    style={{ color: "var(--admin-text-faint)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-hover-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    title="Chi ha questo permesso?">
                    <Users size={13} />
                  </button>

                  {!perm.isSystem && (
                    <button
                      onClick={() => handleDeleteRequest(perm)}
                      disabled={isLoadingThis || deletingId === perm.id}
                      className="p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                      style={{ color: "var(--admin-text-faint)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      title="Elimina permesso">
                      {isLoadingThis || deletingId === perm.id ? (
                        <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function PermissionsManager({ permissions, roles, rolePermsMap }: Props) {
  const [tab, setTab] = useState<"matrix" | "catalog">("catalog");

  return (
    <div className="space-y-5">
      <TabBar active={tab} onChange={setTab} />

      {tab === "matrix" ? (
        <PermissionsMatrix permissions={permissions} roles={roles} rolePermsMap={rolePermsMap} />
      ) : (
        <PermissionsCatalog permissions={permissions} roles={roles} rolePermsMap={rolePermsMap} />
      )}
    </div>
  );
}
