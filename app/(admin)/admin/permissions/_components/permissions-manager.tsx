// app/(admin)/admin/permissions/_components/permissions-manager.tsx
"use client";

import type { Permission } from "@/lib/db/schema";
import type { RoleRow } from "@/lib/db/roles-queries";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Info,
  Loader2,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { useOptimistic, useTransition, useState, useId } from "react";
import {
  createPermission,
  deletePermission,
  grantPermissionToRole,
  revokePermissionFromRole,
} from "../actions";

// ─── Types ────────────────────────────────────────────────────────────
type RolePermission = { roleId: number; permissionId: number };

type Props = {
  permissions: Permission[];
  roles: RoleRow[];
  rolePermissions: RolePermission[];
  systemKeys: { key: string; description: string; group: string }[];
};

// ─── PermissionBadge ──────────────────────────────────────────────────
function PermissionBadge({ perm }: { perm: Permission }) {
  return (
    <code
      className="text-[11px] font-mono px-1.5 py-0.5 rounded"
      style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}>
      {perm.key}
    </code>
  );
}

// ─── PermissionCatalog ────────────────────────────────────────────────
function PermissionCatalog({
  permissions,
  systemKeys,
  onDelete,
}: {
  permissions: Permission[];
  systemKeys: Props["systemKeys"];
  onDelete: (id: number) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [keyValue, setKeyValue] = useState("");
  const datalistId = useId();

  const suggested = systemKeys.find((k) => k.key === keyValue) ?? null;

  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const g = p.group ?? "Altro";
    (acc[g] ??= []).push(p);
    return acc;
  }, {});

  const filtered = search.trim()
    ? Object.fromEntries(
        Object.entries(grouped)
          .map(([g, ps]) => [
            g,
            ps.filter(
              (p) =>
                p.key.toLowerCase().includes(search.toLowerCase()) ||
                p.label.toLowerCase().includes(search.toLowerCase()),
            ),
          ])
          .filter(([, ps]) => (ps as Permission[]).length > 0),
      )
    : grouped;

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setFormError(null);
    startTransition(async () => {
      const res = await createPermission(fd);
      if (res?.error) {
        setFormError(res.error);
      } else {
        setShowCreate(false);
        setKeyValue("");
      }
    });
  }

  // Stile input uniforme al resto dell'admin
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg outline-none border focus:ring-2";
  const inputStyle = {
    background: "var(--admin-page-bg)",
    borderColor: "var(--admin-input-border)",
    color: "var(--admin-text)",
  };

  return (
    <div className="space-y-4">
      {/* Search + create */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--admin-text-faint)" }}
          />
          <input
            type="text"
            placeholder="Filtra permessi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm rounded-lg outline-none"
            style={{ background: "var(--admin-page-bg)", borderColor: "var(--admin-input-border)", color: "var(--admin-text)", border: "1px solid var(--admin-input-border)" }}
          />
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-white whitespace-nowrap"
            style={{ background: "var(--admin-accent)" }}>
            <Plus size={13} /> Nuovo
          </button>
        )}
      </div>

      {/* Inline create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--admin-card-bg)", border: "1px solid oklch(0 0 0 / 0.13)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--admin-text-faint)" }}>
            Nuovo permesso
          </p>

          <datalist id={datalistId}>
            {systemKeys.map((k) => (
              <option key={k.key} value={k.key} label={k.description} />
            ))}
          </datalist>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                Chiave *
              </label>
              <input name="key" list={datalistId} required placeholder="risorsa:azione" className={inputCls} style={inputStyle} value={keyValue} onChange={(e) => setKeyValue(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                Etichetta *
              </label>
              <input name="label" required placeholder="Es. Pubblica articoli" className={inputCls} style={inputStyle} defaultValue={suggested?.description ?? ""} key={suggested?.key ?? "custom"} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                Gruppo *
              </label>
              <input name="group" required placeholder="Es. Contenuti" className={inputCls} style={inputStyle} defaultValue={suggested?.group ?? ""} key={(suggested?.key ?? "custom") + "-group"} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
                Descrizione
              </label>
              <input name="description" placeholder="Opzionale" className={inputCls} style={inputStyle} />
            </div>
          </div>

          {formError && (
            <p className="text-xs flex items-center gap-1" style={{ color: "#dc2626" }}>
              <AlertTriangle size={12} /> {formError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setShowCreate(false); setFormError(null); }} className="px-3 py-1.5 text-sm rounded-lg transition-colors" style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}>Annulla</button>
            <button type="submit" disabled={pending} className="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-60" style={{ background: "var(--admin-accent)", color: "#fff" }}>{pending ? "Salvataggio..." : "Salva"}</button>
          </div>
        </form>
      )}

      {/* Grouped list */}
      {Object.entries(filtered).map(([group, perms]) => (
        <GroupSection
          key={group}
          group={group}
          perms={perms as Permission[]}
          onDelete={onDelete}
        />
      ))}

      {Object.keys(filtered).length === 0 && (
        <div className="py-10 text-center" style={{ color: "var(--admin-text-faint)" }}>
          <Shield size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nessun permesso trovato</p>
        </div>
      )}
    </div>
  );
}

// ─── GroupSection ─────────────────────────────────────────────────────
function GroupSection({
  group,
  perms,
  onDelete,
}: {
  group: string;
  perms: Permission[];
  onDelete: (id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingId, startTransition] = useTransition();

  function handleDelete(id: number) {
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--admin-card-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
        style={{ background: "var(--admin-hover-bg)" }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--admin-text-faint)" }}>
          {group}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--admin-card-border)", color: "var(--admin-text-faint)" }}>
            {perms.length} {perms.length === 1 ? "chiave" : "chiavi"}
          </span>
          {open ? <ChevronDown size={13} style={{ color: "var(--admin-text-faint)" }} /> : <ChevronRight size={13} style={{ color: "var(--admin-text-faint)" }} />}
        </div>
      </button>

      {open && (
        <div className="divide-y" style={{ borderTop: "1px solid var(--admin-card-border)" }}>
          {perms.map((perm) => (
            <div
              key={perm.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ background: "var(--admin-card-bg)" }}>
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--admin-hover-bg)" }}>
                  <Shield size={11} style={{ color: "var(--admin-text-faint)" }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PermissionBadge perm={perm} />
                    <span className="text-sm font-medium truncate" style={{ color: "var(--admin-text)" }}>
                      {perm.label}
                    </span>
                  </div>
                  {perm.description && (
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
                      {perm.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {deletingId === perm.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(perm.id)}
                      disabled={!!pendingId}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Conferma eliminazione">
                      {pendingId ? (
                        <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--admin-text-muted)" }}
                      title="Annulla">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(perm.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--admin-text-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    title="Elimina">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RoleMatrix ───────────────────────────────────────────────────────
function RoleMatrix({
  permissions,
  roles,
  initialRolePermissions,
}: {
  permissions: Permission[];
  roles: RoleRow[];
  initialRolePermissions: RolePermission[];
}) {
  const [optimisticRPs, applyOptimistic] = useOptimistic(
    initialRolePermissions,
    (state, update: { type: "grant" | "revoke"; roleId: number; permissionId: number }) => {
      if (update.type === "grant") {
        return [...state, { roleId: update.roleId, permissionId: update.permissionId }];
      }
      return state.filter(
        (rp) => !(rp.roleId === update.roleId && rp.permissionId === update.permissionId),
      );
    },
  );
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<number | null>(
    roles.length > 0 ? roles[0].id : null,
  );

  const role = roles.find((r) => r.id === selectedRole);

  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const g = p.group ?? "Altro";
    (acc[g] ??= []).push(p);
    return acc;
  }, {});

  const filtered = search.trim()
    ? Object.fromEntries(
        Object.entries(grouped)
          .map(([g, ps]) => [
            g,
            ps.filter(
              (p) =>
                p.key.toLowerCase().includes(search.toLowerCase()) ||
                p.label.toLowerCase().includes(search.toLowerCase()),
            ),
          ])
          .filter(([, ps]) => (ps as Permission[]).length > 0),
      )
    : grouped;

  function hasPermission(roleId: number, permId: number) {
    return optimisticRPs.some((rp) => rp.roleId === roleId && rp.permissionId === permId);
  }

  function toggle(roleId: number, permId: number) {
    const has = hasPermission(roleId, permId);
    startTransition(async () => {
      applyOptimistic({ type: has ? "revoke" : "grant", roleId, permissionId: permId });
      if (has) {
        await revokePermissionFromRole(roleId, permId);
      } else {
        await grantPermissionToRole(roleId, permId);
      }
    });
  }

  if (roles.length === 0) {
    return (
      <div className="py-12 text-center" style={{ color: "var(--admin-text-faint)" }}>
        <Shield size={28} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nessun ruolo trovato</p>
      </div>
    );
  }

  return (
    <div className="flex gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid var(--admin-card-border)", minHeight: 400 }}>
      {/* Sidebar ruoli */}
      <div
        className="w-48 shrink-0 flex flex-col"
        style={{
          background: "var(--admin-card-bg)",
          borderRight: "1px solid var(--admin-card-border)",
        }}>
        <div
          className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ borderBottom: "1px solid var(--admin-card-border)", color: "var(--admin-text-faint)" }}>
          Ruoli
        </div>
        {roles.map((r) => {
          const count = optimisticRPs.filter((rp) => rp.roleId === r.id).length;
          const isActive = selectedRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className="w-full text-left px-3 py-2.5 transition-colors"
              style={{
                background: isActive ? "var(--admin-hover-bg)" : "transparent",
                borderBottom: "1px solid var(--admin-card-border)",
              }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                <span className="text-xs font-medium truncate" style={{ color: isActive ? "var(--admin-text)" : "var(--admin-text-muted)" }}>
                  {r.label}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 ml-4">
                <span className="text-[10px]" style={{ color: "var(--admin-text-faint)" }}>
                  {count} permessi
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Permessi per ruolo selezionato */}
      <div className="flex-1 min-w-0 flex flex-col">
        {role && (
          <>
            <div
              className="px-4 py-2.5 flex items-center justify-between gap-3"
              style={{ borderBottom: "1px solid var(--admin-card-border)", background: "var(--admin-card-bg)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: role.color }} />
                <span className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
                  {role.label}
                </span>
                {role.isAdmin && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-faint)" }}>
                    Admin — tutti i permessi impliciti
                  </span>
                )}
              </div>
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--admin-text-faint)" }}
                />
                <input
                  type="text"
                  placeholder="Filtra..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none border"
                  style={{
                    background: "var(--admin-page-bg)",
                    borderColor: "var(--admin-input-border)",
                    color: "var(--admin-text)",
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {Object.entries(filtered).map(([group, perms]) => (
                <div key={group}>
                  <div
                    className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest sticky top-0"
                    style={{ borderTop: "1px solid var(--admin-card-border)", background: "var(--admin-page-bg)", color: "var(--admin-text-faint)" }}>
                    {group}
                  </div>
                  {(perms as Permission[]).map((perm) => {
                    const has = hasPermission(role.id, perm.id);
                    return (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors"
                        style={{
                          borderTop: "1px solid var(--admin-card-border)",
                          background: has ? "color-mix(in oklch, var(--admin-accent) 5%, var(--admin-card-bg))" : "var(--admin-card-bg)",
                        }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}>
                              {perm.key}
                            </code>
                            <span className="text-xs" style={{ color: "var(--admin-text)" }}>
                              {perm.label}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggle(role.id, perm.id)}
                          disabled={role.isAdmin}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                          title={role.isAdmin ? "Admin ha tutti i permessi" : has ? "Revoca" : "Assegna"}
                          style={{
                            background: has ? "color-mix(in oklch, var(--admin-accent) 15%, transparent)" : "var(--admin-hover-bg)",
                          }}>
                          {has ? (
                            <ShieldCheck size={14} style={{ color: "var(--admin-accent)" }} />
                          ) : (
                            <ShieldOff size={14} style={{ color: "var(--admin-text-faint)" }} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}

              {Object.keys(filtered).length === 0 && (
                <div className="py-10 text-center" style={{ color: "var(--admin-text-faint)" }}>
                  <p className="text-sm">Nessun permesso trovato</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SystemKeysPanel ──────────────────────────────────────────────────
function SystemKeysPanel({ keys }: { keys: Props["systemKeys"] }) {
  const [open, setOpen] = useState(false);

  const grouped = keys.reduce<Record<string, typeof keys>>((acc, k) => {
    (acc[k.group] ??= []).push(k);
    return acc;
  }, {});

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-hover-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
        <div className="flex items-center gap-2">
          <HelpCircle size={14} style={{ color: "var(--admin-accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>
            Chiavi di sistema disponibili
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--admin-card-border)", color: "var(--admin-text-faint)" }}>
            {keys.length} chiavi
          </span>
          <ChevronRight
            size={13}
            style={{
              color: "var(--admin-text-faint)",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 200ms",
            }}
          />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--admin-card-border)" }}>
          {Object.entries(grouped).map(([group, ks]) => (
            <div key={group}>
              <div
                className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-faint)" }}>
                {group}
              </div>
              {ks.map((k) => (
                <div
                  key={k.key}
                  className="flex items-center gap-3 px-4 py-2"
                  style={{ borderTop: "1px solid var(--admin-card-border)", background: "var(--admin-page-bg)" }}>
                  <code
                    className="text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}>
                    {k.key}
                  </code>
                  <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                    {k.description}
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

// ─── Tabs ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "catalog", label: "Catalogo permessi", icon: Shield },
  { id: "matrix", label: "Matrice ruoli", icon: ShieldCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Root ─────────────────────────────────────────────────────────────
export function PermissionsManager({
  permissions: initialPermissions,
  roles,
  rolePermissions,
  systemKeys,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("catalog");
  const [optimisticPerms, applyOptimistic] = useOptimistic(
    initialPermissions,
    (state, id: number) => state.filter((p) => p.id !== id),
  );
  const [, startTransition] = useTransition();

  async function handleDelete(id: number) {
    startTransition(async () => {
      applyOptimistic(id);
      await deletePermission(id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Info card */}
      <SystemKeysPanel keys={systemKeys} />

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--admin-hover-bg)" }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
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
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "catalog" && (
        <PermissionCatalog
          permissions={optimisticPerms}
          systemKeys={systemKeys}
          onDelete={handleDelete}
        />
      )}
      {activeTab === "matrix" && (
        <RoleMatrix
          permissions={optimisticPerms}
          roles={roles}
          initialRolePermissions={rolePermissions}
        />
      )}
    </div>
  );
}
