// app/(admin)/admin/users/[id]/_components/user-access-tab.tsx
"use client";

import type { Permission } from "@/lib/db/schema";
import type { RoleRow } from "@/lib/db/roles-queries";
import { Check, Clock, Plus, Shield, ShieldOff, Trash2, X } from "lucide-react";
import { useTransition, useState } from "react";
import { addOverride, removeOverride } from "../actions";

type Override = {
  id: number;
  permissionKey: string;
  permissionLabel: string;
  permissionGroup: string;
  granted: boolean;
  reason: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  grantedById: number | null;
};

type Props = {
  userId: number;
  rolePerms: { key: string; label: string; group: string }[];
  overrides: Override[];
  allPermissions: Permission[];
  userRole: RoleRow | null;
};

// ─── Badge permesso ───────────────────────────────────────────────────
function PermBadge({
  granted,
  label,
}: {
  granted: boolean;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: granted ? "#dcfce7" : "#fef2f2",
        color: granted ? "#16a34a" : "#dc2626",
      }}>
      {granted ? <Check size={9} /> : <ShieldOff size={9} />}
      {label}
    </span>
  );
}

// ─── Form aggiungi override ───────────────────────────────────────────
function AddOverrideForm({
  userId,
  allPermissions,
  onClose,
}: {
  userId: number;
  allPermissions: Permission[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const groups = allPermissions.reduce(
    (acc, p) => {
      if (!acc[p.group]) acc[p.group] = [];
      acc[p.group].push(p);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("userId", String(userId));
    startTransition(async () => {
      const res = await addOverride(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        onClose();
      }
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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl p-5 space-y-4"
      style={{
        background: "var(--admin-card-bg)",
        border: "2px solid var(--admin-accent)",
      }}>
      <h4
        className="text-sm font-semibold"
        style={{ color: "var(--admin-text)" }}>
        Aggiungi override
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Permesso */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--admin-text-muted)" }}>
            Permesso
          </label>
          <select name="permissionId" required className={inputCls} style={inputStyle}>
            <option value="">Seleziona...</option>
            {Object.entries(groups).map(([group, perms]) => (
              <optgroup key={group} label={group}>
                {perms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.key}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--admin-text-muted)" }}>
            Tipo
          </label>
          <select name="granted" required className={inputCls} style={inputStyle}>
            <option value="true">✅ Concedi (grant)</option>
            <option value="false">❌ Revoca (revoke)</option>
          </select>
        </div>
      </div>

      {/* Scadenza */}
      <div>
        <label
          className="block text-xs font-medium mb-1"
          style={{ color: "var(--admin-text-muted)" }}>
          Scadenza{" "}
          <span style={{ color: "var(--admin-text-faint)" }}>(lascia vuoto = permanente)</span>
        </label>
        <input
          type="datetime-local"
          name="expiresAt"
          className={inputCls}
          style={inputStyle}
        />
      </div>

      {/* Motivazione */}
      <div>
        <label
          className="block text-xs font-medium mb-1"
          style={{ color: "var(--admin-text-muted)" }}>
          Motivazione (opzionale)
        </label>
        <textarea
          name="reason"
          rows={2}
          placeholder="Perché stai applicando questo override..."
          className={inputCls}
          style={inputStyle}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
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
          Applica
        </button>
      </div>
    </form>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────
export function UserAccessTab({
  userId,
  rolePerms,
  overrides,
  allPermissions,
  userRole,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Raggruppa permessi del ruolo per gruppo
  const roleGroups = rolePerms.reduce(
    (acc, p) => {
      if (!acc[p.group]) acc[p.group] = [];
      acc[p.group].push(p);
      return acc;
    },
    {} as Record<string, typeof rolePerms>,
  );

  function handleRemove(overrideId: number) {
    setDeletingId(overrideId);
    startTransition(async () => {
      await removeOverride(overrideId, userId);
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Permessi ereditati dal ruolo */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={15} style={{ color: "var(--admin-text-faint)" }} />
          <h4 className="text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
            Permessi dal ruolo
          </h4>
          {userRole && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: (userRole.color ?? "#6b7280") + "18",
                color: userRole.color ?? "#6b7280",
                border: `1px solid ${(userRole.color ?? "#6b7280")}40`,
              }}>
              {userRole.label}
            </span>
          )}
          <span
            className="text-xs ml-auto"
            style={{ color: "var(--admin-text-faint)" }}>
            {rolePerms.length} permessi
          </span>
        </div>

        {rolePerms.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--admin-text-faint)" }}>
            Nessun permesso assegnato al ruolo.
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(roleGroups).map(([group, perms]) => (
              <div key={group}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--admin-text-faint)" }}>
                  {group}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((p) => (
                    <span
                      key={p.key}
                      className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-lg"
                      style={{
                        background: "var(--admin-hover-bg)",
                        color: "var(--admin-text-muted)",
                        border: "1px solid var(--admin-card-border)",
                      }}
                      title={p.label}>
                      <Check size={9} style={{ color: "#16a34a" }} />
                      {p.key}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Override individuali */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
        }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4
              className="text-sm font-semibold"
              style={{ color: "var(--admin-text)" }}>
              Override individuali
            </h4>
            <span
              className="text-xs"
              style={{ color: "var(--admin-text-faint)" }}>
              ({overrides.length})
            </span>
          </div>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
              style={{ background: "var(--admin-accent)" }}>
              <Plus size={12} /> Aggiungi
            </button>
          )}
        </div>

        {showAdd && (
          <div className="mb-4">
            <AddOverrideForm
              userId={userId}
              allPermissions={allPermissions}
              onClose={() => setShowAdd(false)}
            />
          </div>
        )}

        {overrides.length === 0 && !showAdd ? (
          <div
            className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl border-2 border-dashed"
            style={{ borderColor: "var(--admin-card-border)" }}>
            <Shield size={24} style={{ opacity: 0.2, color: "var(--admin-text)" }} />
            <p className="text-sm" style={{ color: "var(--admin-text-faint)" }}>
              Nessun override — questo utente usa i permessi del ruolo
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white mt-1"
              style={{ background: "var(--admin-accent)" }}>
              <Plus size={12} /> Aggiungi il primo
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {overrides.map((ov) => {
              const isExpired = ov.expiresAt
                ? new Date(ov.expiresAt) < new Date()
                : false;
              return (
                <div
                  key={ov.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{
                    background: isExpired
                      ? "var(--admin-bg)"
                      : ov.granted
                      ? "#f0fdf4"
                      : "#fef2f2",
                    border: `1px solid ${
                      isExpired
                        ? "var(--admin-card-border)"
                        : ov.granted
                        ? "#bbf7d0"
                        : "#fecaca"
                    }`,
                    opacity: isExpired ? 0.6 : 1,
                  }}>
                  {/* Tipo */}
                  <div className="shrink-0">
                    {ov.granted ? (
                      <Check size={14} style={{ color: "#16a34a" }} />
                    ) : (
                      <X size={14} style={{ color: "#dc2626" }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code
                        className="text-[11px] font-mono"
                        style={{ color: "var(--admin-text)" }}>
                        {ov.permissionKey}
                      </code>
                      <PermBadge
                        granted={ov.granted}
                        label={ov.granted ? "Concesso" : "Revocato"}
                      />
                      {isExpired && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "var(--admin-hover-bg)",
                            color: "var(--admin-text-faint)",
                          }}>
                          Scaduto
                        </span>
                      )}
                    </div>
                    {ov.reason && (
                      <p
                        className="text-[11px] mt-0.5 truncate"
                        style={{ color: "var(--admin-text-muted)" }}>
                        {ov.reason}
                      </p>
                    )}
                    {ov.expiresAt && (
                      <p
                        className="text-[10px] mt-0.5 flex items-center gap-1"
                        style={{ color: "var(--admin-text-faint)" }}>
                        <Clock size={9} />
                        Scade il{" "}
                        {new Date(ov.expiresAt).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  {/* Rimuovi */}
                  <button
                    onClick={() => handleRemove(ov.id)}
                    disabled={deletingId === ov.id}
                    className="p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                    style={{ color: "var(--admin-text-faint)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#fef2f2")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    title="Rimuovi override">
                    {deletingId === ov.id ? (
                      <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
