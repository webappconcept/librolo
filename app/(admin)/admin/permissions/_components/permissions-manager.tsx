// app/(admin)/admin/permissions/_components/permissions-manager.tsx
"use client";

import type { Permission } from "@/lib/db/schema";
import type { RoleRow } from "@/lib/db/roles-queries";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTransition, useState, useMemo } from "react";
import {
  createPermission,
  deletePermission,
  toggleRolePermission,
} from "../actions";

type Props = {
  permissions: Permission[];
  roles: RoleRow[];
  rolePermsMap: Record<number, number[]>;
};

// ─── Tab bar ─────────────────────────────────────────────────────────
function TabBar({
  active,
  onChange,
}: {
  active: "matrix" | "catalog";
  onChange: (t: "matrix" | "catalog") => void;
}) {
  const tabs = [
    { id: "matrix" as const, label: "Matrice ruoli" },
    { id: "catalog" as const, label: "Catalogo permessi" },
  ];
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl w-fit"
      style={{ background: "var(--admin-hover-bg)" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
          style={{
            background: active === t.id ? "var(--admin-card-bg)" : "transparent",
            color:
              active === t.id ? "var(--admin-text)" : "var(--admin-text-muted)",
            boxShadow:
              active === t.id ? "0 1px 3px oklch(0 0 0 / 0.08)" : "none",
          }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Lock icon con tooltip nativo ────────────────────────────────────
function SystemLockIcon() {
  return (
    <span title="Permesso di sistema" style={{ display: "inline-flex" }}>
      <Lock size={10} style={{ color: "var(--admin-text-faint)" }} />
    </span>
  );
}

// ─── Matrice ruoli → permessi ─────────────────────────────────────────
function PermissionsMatrix({
  permissions,
  roles,
  rolePermsMap,
}: Props) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  function handleToggle(
    roleId: number,
    permissionId: number,
    currentlyGranted: boolean,
  ) {
    const key = `${roleId}-${permissionId}`;
    setPendingKey(key);
    startTransition(async () => {
      await toggleRolePermission(roleId, permissionId, !currentlyGranted);
      setPendingKey(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Ricerca */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--admin-text-faint)" }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtra permessi..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none border"
          style={{
            background: "var(--admin-bg)",
            borderColor: "var(--admin-card-border)",
            color: "var(--admin-text)",
          }}
        />
      </div>

      {/* Tabella */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--admin-card-border)" }}>
        {/* Header ruoli */}
        <div
          className="grid items-center text-xs font-semibold uppercase tracking-wide"
          style={{
            gridTemplateColumns: `1fr repeat(${roles.length}, minmax(80px, 1fr))`,
            background: "var(--admin-hover-bg)",
            borderBottom: "1px solid var(--admin-card-border)",
          }}>
          <div className="px-4 py-3" style={{ color: "var(--admin-text-faint)" }}>
            Permesso
          </div>
          {roles.map((r) => (
            <div
              key={r.id}
              className="px-3 py-3 text-center"
              style={{ color: r.color }}>
              {r.label}
            </div>
          ))}
        </div>

        {groups.size === 0 && (
          <div
            className="flex items-center justify-center py-12 text-sm"
            style={{ color: "var(--admin-text-faint)" }}>
            Nessun permesso trovato
          </div>
        )}

        {Array.from(groups.entries()).map(([group, perms]) => {
          const collapsed = collapsedGroups.has(group);
          return (
            <div key={group}>
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: "var(--admin-hover-bg)",
                  borderTop: "1px solid var(--admin-card-border)",
                  color: "var(--admin-text-muted)",
                }}>
                {collapsed ? (
                  <ChevronRight size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  {group}
                </span>
                <span
                  className="text-[10px] ml-auto px-1.5 py-0.5 rounded"
                  style={{
                    background: "var(--admin-card-border)",
                    color: "var(--admin-text-faint)",
                  }}>
                  {perms.length}
                </span>
              </button>

              {!collapsed &&
                perms.map((perm, i) => (
                  <div
                    key={perm.id}
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: `1fr repeat(${roles.length}, minmax(80px, 1fr))`,
                      background:
                        i % 2 === 0
                          ? "var(--admin-card-bg)"
                          : "var(--admin-bg)",
                      borderTop: "1px solid var(--admin-card-border)",
                    }}>
                    <div className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <code
                          className="text-[11px] font-mono"
                          style={{ color: "var(--admin-text)" }}>
                          {perm.key}
                        </code>
                        {perm.isSystem && <SystemLockIcon />}
                      </div>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: "var(--admin-text-faint)" }}>
                        {perm.label}
                      </p>
                    </div>

                    {roles.map((role) => {
                      const granted = (
                        rolePermsMap[role.id] ?? []
                      ).includes(perm.id);
                      const key = `${role.id}-${perm.id}`;
                      const isPending = pendingKey === key;

                      return (
                        <div
                          key={role.id}
                          className="flex items-center justify-center px-3 py-2.5">
                          <button
                            onClick={() =>
                              handleToggle(role.id, perm.id, granted)
                            }
                            disabled={isPending}
                            aria-label={`${granted ? "Rimuovi" : "Aggiungi"} ${perm.key} da ${role.label}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                            style={{
                              background: granted
                                ? role.color + "18"
                                : "var(--admin-hover-bg)",
                              border: `1px solid ${
                                granted ? role.color + "40" : "var(--admin-card-border)"
                              }`,
                            }}>
                            {isPending ? (
                              <div
                                className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                                style={{
                                  borderColor: role.color,
                                  borderTopColor: "transparent",
                                }}
                              />
                            ) : granted ? (
                              <Check size={13} style={{ color: role.color }} />
                            ) : (
                              <X
                                size={11}
                                style={{ color: "var(--admin-text-faint)" }}
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
    </div>
  );
}

// ─── Catalogo permessi ────────────────────────────────────────────────
function PermissionsCatalog({
  permissions,
  roles,
  rolePermsMap,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  function handleDelete(id: number) {
    setDeletingId(id);
    startTransition(async () => {
      await deletePermission(id);
      setDeletingId(null);
    });
  }

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg outline-none border focus:ring-2";
  const inputStyle = {
    background: "var(--admin-bg)",
    borderColor: "var(--admin-card-border)",
    color: "var(--admin-text)",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--admin-text-faint)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtra permessi..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none border"
            style={{
              background: "var(--admin-bg)",
              borderColor: "var(--admin-card-border)",
              color: "var(--admin-text)",
            }}
          />
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-white shrink-0"
            style={{ background: "var(--admin-accent)" }}>
            <Plus size={13} /> Nuovo
          </button>
        )}
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl p-5 space-y-4"
          style={{
            background: "var(--admin-card-bg)",
            border: "2px solid var(--admin-accent)",
          }}>
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--admin-text)" }}>
            Nuovo permesso
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--admin-text-muted)" }}>
                Chiave{" "}
                <span style={{ color: "var(--admin-text-faint)" }}>
                  (risorsa:azione)
                </span>
              </label>
              <input
                name="key"
                required
                placeholder="es. posts:publish"
                className={inputCls}
                style={{ ...inputStyle, fontFamily: "monospace" }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--admin-text-muted)" }}>
                Gruppo
              </label>
              <input
                name="group"
                required
                placeholder="es. Contenuti"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "var(--admin-text-muted)" }}>
              Etichetta visibile
            </label>
            <input
              name="label"
              required
              placeholder="es. Pubblica post senza approvazione"
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "var(--admin-text-muted)" }}>
              Descrizione (opzionale)
            </label>
            <textarea
              name="description"
              rows={2}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          {formError && (
            <p className="text-xs text-red-600">{formError}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setFormError(null); }}
              className="px-4 py-2 text-sm rounded-lg"
              style={{
                color: "var(--admin-text-muted)",
                background: "var(--admin-hover-bg)",
              }}>
              Annulla
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ background: "var(--admin-accent)" }}>
              {pending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Crea permesso
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {Array.from(groups.entries()).map(([group, perms]) => (
          <div
            key={group}
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--admin-card-border)" }}>
            <div
              className="px-4 py-2.5 flex items-center justify-between"
              style={{
                background: "var(--admin-hover-bg)",
                borderBottom: "1px solid var(--admin-card-border)",
              }}>
              <span
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--admin-text-muted)" }}>
                {group}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: "var(--admin-card-border)",
                  color: "var(--admin-text-faint)",
                }}>
                {perms.length}
              </span>
            </div>

            {perms.map((perm, i) => {
              const assignedRoles = permToRoles.get(perm.id) ?? [];
              return (
                <div
                  key={perm.id}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{
                    background:
                      i % 2 === 0
                        ? "var(--admin-card-bg)"
                        : "var(--admin-bg)",
                    borderTop:
                      i > 0
                        ? "1px solid var(--admin-card-border)"
                        : "none",
                  }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <code
                        className="text-[11px] font-mono"
                        style={{ color: "var(--admin-text)" }}>
                        {perm.key}
                      </code>
                      {perm.isSystem && <SystemLockIcon />}
                    </div>
                    <p
                      className="text-[11px] mt-0.5 truncate"
                      style={{ color: "var(--admin-text-faint)" }}>
                      {perm.label}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {assignedRoles.length === 0 ? (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--admin-hover-bg)",
                          color: "var(--admin-text-faint)",
                        }}>
                        Nessun ruolo
                      </span>
                    ) : (
                      assignedRoles.map((r) => (
                        <span
                          key={r.id}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: r.color + "18",
                            color: r.color,
                            border: `1px solid ${r.color}40`,
                          }}>
                          {r.label}
                        </span>
                      ))
                    )}
                  </div>

                  {!perm.isSystem && (
                    <button
                      onClick={() => handleDelete(perm.id)}
                      disabled={deletingId === perm.id}
                      className="p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                      style={{ color: "var(--admin-text-faint)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#fef2f2")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                      title="Elimina permesso">
                      {deletingId === perm.id ? (
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
        ))}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────
export function PermissionsManager({ permissions, roles, rolePermsMap }: Props) {
  const [tab, setTab] = useState<"matrix" | "catalog">("matrix");

  return (
    <div className="space-y-5">
      <TabBar active={tab} onChange={setTab} />

      {tab === "matrix" ? (
        <PermissionsMatrix
          permissions={permissions}
          roles={roles}
          rolePermsMap={rolePermsMap}
        />
      ) : (
        <PermissionsCatalog
          permissions={permissions}
          roles={roles}
          rolePermsMap={rolePermsMap}
        />
      )}
    </div>
  );
}
