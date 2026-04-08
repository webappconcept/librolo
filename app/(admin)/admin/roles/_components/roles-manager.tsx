// app/(admin)/admin/roles/_components/roles-manager.tsx
"use client";

import type { RoleRow } from "@/lib/db/roles-queries";
import {
  Check,
  Lock,
  Pencil,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useTransition, useState } from "react";
import { createRole, deleteRole, updateRole } from "../actions";

// ─── Colori preset per il color picker rapido ───────────────────────────
const COLOR_PRESETS = [
  "#6b7280", "#2563eb", "#16a34a", "#7c3aed",
  "#dc2626", "#d97706", "#db2777", "#0891b2",
];

// ─── RoleBadge ─────────────────────────────────────────────────────
function RoleBadge({ role }: { role: RoleRow }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{
        background: role.color + "18",
        color: role.color,
        border: `1px solid ${role.color}40`,
      }}>
      {role.label}
    </span>
  );
}

// ─── RoleForm (create / edit) ─────────────────────────────────────────
function RoleForm({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial?: RoleRow;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [color, setColor] = useState(initial?.color ?? "#6b7280");
  const [isAdmin, setIsAdmin] = useState(initial?.isAdmin ?? false);
  const [isStaff, setIsStaff] = useState(initial?.isStaff ?? false);
  const isEdit = !!initial;
  const isSystem = initial?.isSystem ?? false;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("color", color);
    fd.set("isAdmin", String(isAdmin));
    fd.set("isStaff", String(isStaff || isAdmin));
    onSave(fd);
  }

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg outline-none transition-all" +
    " border focus:ring-2";
  const inputStyle = {
    background: "var(--admin-bg)",
    borderColor: "var(--admin-card-border)",
    color: "var(--admin-text)",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            Slug (identificatore interno)
          </label>
          <input
            name="name"
            defaultValue={initial?.name}
            disabled={isSystem}
            placeholder="es. editor"
            required
            className={inputCls}
            style={{ ...inputStyle, opacity: isSystem ? 0.5 : 1 }}
          />
          {isSystem && (
            <p className="text-[11px] mt-1" style={{ color: "var(--admin-text-faint)" }}>
              Lo slug dei ruoli di sistema non può essere modificato.
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
            Etichetta visibile
          </label>
          <input
            name="label"
            defaultValue={initial?.label}
            placeholder="es. Editore"
            required
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--admin-text-muted)" }}>
          Descrizione (opzionale)
        </label>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={2}
          placeholder="Cosa può fare questo ruolo..."
          className={inputCls}
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: "var(--admin-text-muted)" }}>
          Colore badge
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor: color === c ? "var(--admin-text)" : "transparent",
              }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border"
            style={{ borderColor: "var(--admin-card-border)" }}
            title="Colore personalizzato"
          />
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}>
            {color}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="mt-0.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={isStaff || isAdmin}
              onClick={() => { if (!isAdmin) setIsStaff((v) => !v); }}
              className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
              style={{
                background: (isStaff || isAdmin) ? "var(--admin-accent)" : "transparent",
                borderColor: (isStaff || isAdmin) ? "var(--admin-accent)" : "var(--admin-card-border)",
                opacity: isAdmin ? 0.6 : 1,
              }}>
              {(isStaff || isAdmin) && <Check size={11} className="text-white" />}
            </button>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>Staff</p>
            <p className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
              Può accedere alle sezioni riservate allo staff (es. dashboard, ticket).
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="mt-0.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={isAdmin}
              onClick={() => {
                const next = !isAdmin;
                setIsAdmin(next);
                if (next) setIsStaff(true);
              }}
              className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
              style={{
                background: isAdmin ? "#7c3aed" : "transparent",
                borderColor: isAdmin ? "#7c3aed" : "var(--admin-card-border)",
              }}>
              {isAdmin && <Check size={11} className="text-white" />}
            </button>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>
              Amministratore
            </p>
            <p className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
              Accesso completo al pannello admin. Implica automaticamente lo Staff.
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg transition-colors"
          style={{ color: "var(--admin-text-muted)", background: "var(--admin-hover-bg)" }}>
          Annulla
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
          style={{ background: "var(--admin-accent)" }}>
          {pending ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {isEdit ? "Salva modifiche" : "Crea ruolo"}
        </button>
      </div>
    </form>
  );
}

// ─── RoleCard ─────────────────────────────────────────────────────────
function RoleCard({ role, onEdit }: { role: RoleRow; onEdit: (r: RoleRow) => void }) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteRole(role.id);
    });
  }

  return (
    <div
      className="rounded-xl p-4 transition-shadow hover:shadow-md"
      style={{
        background: "var(--admin-card-bg)",
        border: `1px solid var(--admin-card-border)`,
      }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: role.color + "18", border: `1px solid ${role.color}40` }}>
            {role.isAdmin ? (
              <ShieldCheck size={16} style={{ color: role.color }} />
            ) : (
              <Shield size={16} style={{ color: role.color }} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <RoleBadge role={role} />
              {role.isSystem && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-faint)" }}>
                  <Lock size={9} /> sistema
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
              slug: {role.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(role)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--admin-text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-hover-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            title="Modifica">
            <Pencil size={13} />
          </button>
          {!role.isSystem && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  title="Conferma eliminazione">
                  {pending ? (
                    <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--admin-text-muted)" }}
                  title="Annulla">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--admin-text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Elimina">
                <Trash2 size={13} />
              </button>
            )
          )}
        </div>
      </div>

      {role.description && (
        <p className="text-xs mt-2.5 leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
          {role.description}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-3">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: role.isStaff ? "#eff6ff" : "var(--admin-hover-bg)",
            color: role.isStaff ? "#2563eb" : "var(--admin-text-faint)",
          }}>
          {role.isStaff ? <Check size={9} /> : <X size={9} />} Staff
        </span>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: role.isAdmin ? "#f5f3ff" : "var(--admin-hover-bg)",
            color: role.isAdmin ? "#7c3aed" : "var(--admin-text-faint)",
          }}>
          {role.isAdmin ? <Check size={9} /> : <X size={9} />} Admin
        </span>
      </div>
    </div>
  );
}

// ─── RolesManager (root) ────────────────────────────────────────────────
export function RolesManager({ roles }: { roles: RoleRow[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(fd: FormData) {
    startTransition(async () => {
      await createRole(fd);
      setShowCreate(false);
    });
  }

  function handleUpdate(fd: FormData) {
    if (!editingRole) return;
    startTransition(async () => {
      await updateRole(editingRole.id, fd);
      setEditingRole(null);
    });
  }

  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);

  return (
    <div className="space-y-6">
      {showCreate && (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--admin-card-bg)", border: "1px solid var(--admin-card-border)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text)" }}>
            Nuovo ruolo
          </h3>
          <RoleForm onSave={handleCreate} onCancel={() => setShowCreate(false)} pending={pending} />
        </div>
      )}

      {editingRole && (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--admin-card-bg)", border: "2px solid var(--admin-accent)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text)" }}>
            Modifica ruolo — <span style={{ color: editingRole.color }}>{editingRole.label}</span>
          </h3>
          <RoleForm
            initial={editingRole}
            onSave={handleUpdate}
            onCancel={() => setEditingRole(null)}
            pending={pending}
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--admin-text-faint)" }}>
            Ruoli di sistema ({systemRoles.length})
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {systemRoles.map((r) => (
            <RoleCard key={r.id} role={r} onEdit={setEditingRole} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--admin-text-faint)" }}>
            Ruoli personalizzati ({customRoles.length})
          </h3>
          {!showCreate && !editingRole && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
              style={{ background: "var(--admin-accent)" }}>
              <Plus size={13} /> Nuovo ruolo
            </button>
          )}
        </div>
        {customRoles.length === 0 ? (
          <div
            className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 gap-3"
            style={{ borderColor: "var(--admin-card-border)", color: "var(--admin-text-faint)" }}>
            <Shield size={28} style={{ opacity: 0.3 }} />
            <p className="text-sm">Nessun ruolo personalizzato</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
              style={{ background: "var(--admin-accent)" }}>
              <Plus size={13} /> Crea il primo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customRoles.map((r) => (
              <RoleCard key={r.id} role={r} onEdit={setEditingRole} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
