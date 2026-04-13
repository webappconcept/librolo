// app/(admin)/admin/users/[id]/_components/user-detail-client.tsx
"use client";

import type { AdminUserDetail } from "@/lib/db/admin-queries";
import type { RoleRow } from "@/lib/db/roles-queries";
import { Check, Shield, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import BanModal from "../../_components/ban-modal";
import DeleteModal from "../../_components/delete-modal";
import { unbanUser } from "../../actions";
import { setUserRole } from "../../../roles/actions";

// ─── BanButton ────────────────────────────────────────────────────────
export function BanButton({ user }: { user: AdminUserDetail }) {
  const [showModal, setShowModal] = useState(false);
  const [pending, startTransition] = useTransition();
  const isBanned = !!user.bannedAt;
  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  if (user.isAdmin) {
    return (
      <span className="text-xs text-gray-400 italic">
        Gli admin non possono essere sospesi
      </span>
    );
  }

  return (
    <>
      {isBanned ? (
        <button
          disabled={pending}
          onClick={() => startTransition(() => unbanUser(user.id))}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50">
          <ShieldCheck size={15} /> Riattiva account
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
          <ShieldBan size={15} /> Sospendi account
        </button>
      )}
      {showModal && (
        <BanModal userId={user.id} userName={userName} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

// ─── DeleteButton ─────────────────────────────────────────────────────
export function DeleteButton({
  user,
  canDelete,
}: {
  user: AdminUserDetail;
  canDelete: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  // Non mostrare nulla se: non ha permesso, è già eliminato, o è admin
  if (!canDelete || !!user.deletedAt || user.isAdmin) return null;

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Elimina utente"
        aria-label="Elimina utente"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        style={{
          background: "var(--admin-hover-bg)",
          color: "var(--color-error, #a12c7b)",
        }}>
        <Trash2 size={15} />
        Elimina account
      </button>
      {showModal && (
        <DeleteModal
          userId={user.id}
          userName={fullName}
          userEmail={user.email}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ─── RoleSelector — con ruoli da DB ──────────────────────────────────
export function RoleSelector({
  user,
  availableRoles,
}: {
  user: AdminUserDetail;
  availableRoles: RoleRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(user.role);
  const [saved, setSaved] = useState(false);

  const currentRoleData = availableRoles.find((r) => r.name === selected);

  function handleSelect(roleName: string) {
    setSelected(roleName);
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await setUserRole(user.id, selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {/* Griglia ruoli */}
      <div className="grid grid-cols-1 gap-2">
        {availableRoles.map((role) => {
          const isSelected = selected === role.name;
          return (
            <button
              key={role.name}
              type="button"
              onClick={() => handleSelect(role.name)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
              style={{
                background: isSelected ? role.color + "12" : "var(--admin-bg)",
                border: isSelected
                  ? `2px solid ${role.color}`
                  : "2px solid var(--admin-card-border)",
              }}>
              {/* Icona */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: role.color + "20" }}>
                <Shield size={14} style={{ color: role.color }} />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isSelected ? role.color : "var(--admin-text)" }}>
                    {role.label}
                  </span>
                  {role.isAdmin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                      Admin
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--admin-text-faint)" }}>
                    {role.description}
                  </p>
                )}
              </div>
              {/* Check selezione */}
              {isSelected && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: role.color }}>
                  <Check size={11} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer — salva solo se cambiato */}
      {selected !== user.role && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
            Cambio da{" "}
            <strong style={{ color: "var(--admin-text-muted)" }}>
              {availableRoles.find((r) => r.name === user.role)?.label ?? user.role}
            </strong>
            {" "}→{" "}
            <strong style={{ color: currentRoleData?.color }}>
              {currentRoleData?.label ?? selected}
            </strong>
          </p>
          <button
            onClick={handleSave}
            disabled={pending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: "var(--admin-accent)" }}>
            {pending ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <Check size={12} />
            ) : null}
            {saved ? "Salvato" : "Applica ruolo"}
          </button>
        </div>
      )}
    </div>
  );
}
