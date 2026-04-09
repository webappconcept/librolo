// app/(admin)/admin/staff/_components/staff-table.tsx
"use client";

import type { AdminUser } from "@/lib/db/admin-queries";
import { UserCog } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { changeStaffRole } from "../actions";

// Solo nomi e label dei ruoli di sistema — il colore viene sempre dal DB (user.roleColor)
const STAFF_ROLES: { name: string; label: string }[] = [
  { name: "admin",   label: "Admin" },
  { name: "editor",  label: "Editore" },
  { name: "support", label: "Supporto" },
];

function RoleBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: color + "18",
        color,
        border: `1px solid ${color}40`,
      }}>
      {label}
    </span>
  );
}

function StaffRow({ user }: { user: AdminUser }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || user.email[0].toUpperCase();

  // Colore e label sempre dal DB tramite join con roles
  const roleColor = user.roleColor ?? "#6b7280";
  const roleLabel = user.roleLabel ?? user.role;

  function handleRoleChange(roleName: string) {
    setOpen(false);
    startTransition(() => changeStaffRole(user.id, roleName));
  }

  return (
    <tr
      className="transition-colors"
      style={{ borderBottom: "1px solid var(--admin-divider)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-hover-bg)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: roleColor }}>
            {initials}
          </div>
          <div>
            <Link
              href={`/admin/users/${user.id}`}
              className="text-sm font-medium transition-colors leading-none admin-user-link"
              style={{ color: "var(--admin-text)" }}>
              {user.firstName} {user.lastName}
            </Link>
            <p className="text-xs mt-0.5" style={{ color: "var(--admin-text-faint)" }}>
              {user.email}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="relative inline-block">
          <button
            onClick={() => setOpen((v) => !v)}
            disabled={pending}
            className="flex items-center gap-1.5 transition-opacity disabled:opacity-50"
            title="Cambia ruolo">
            <RoleBadge label={roleLabel} color={roleColor} />
            <UserCog size={13} style={{ color: "var(--admin-text-faint)" }} />
          </button>
          {open && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl overflow-hidden"
              style={{
                background: "var(--admin-card-bg)",
                border: "1px solid var(--admin-card-border)",
                minWidth: "140px",
              }}>
              {STAFF_ROLES.map((r) => (
                <button
                  key={r.name}
                  onClick={() => handleRoleChange(r.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                  style={{ color: "var(--admin-text)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-hover-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  {/* Il pallino usa il colore attuale solo se è il ruolo selezionato, altrimenti neutro */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: r.name === user.role ? roleColor : "var(--admin-text-faint)",
                    }}
                  />
                  {r.label}
                  {r.name === user.role && (
                    <span className="ml-auto text-[10px]" style={{ color: "var(--admin-text-faint)" }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      <td className="px-4 py-3 hidden lg:table-cell">
        <span
          className={`text-[11px] font-medium ${
            user.emailVerified ? "text-emerald-600" : ""
          }`}
          style={!user.emailVerified ? { color: "var(--admin-text-faint)" } : {}}>
          {user.emailVerified ? "✓ Verificata" : "Non verificata"}
        </span>
      </td>

      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
          {new Date(user.createdAt).toLocaleDateString("it-IT")}
        </span>
      </td>

      <td className="px-4 py-3">
        <Link
          href={`/admin/users/${user.id}`}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ background: "var(--admin-hover-bg)", color: "var(--admin-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-input-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--admin-hover-bg)")}>
          Scheda
        </Link>
      </td>
    </tr>
  );
}

export default function StaffTable({ users }: { users: AdminUser[] }) {
  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-sm" style={{ color: "var(--admin-text-faint)" }}>
        Nessun membro dello staff trovato.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[580px]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--admin-divider)" }}>
            {["Membro", "Ruolo", "Email", "Aggiunto il", ""].map((h, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide ${
                  i >= 2 && i <= 3 ? "hidden lg:table-cell" : ""
                }`}
                style={{ color: "var(--admin-text-faint)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <StaffRow key={u.id} user={u} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
