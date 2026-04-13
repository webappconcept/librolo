// app/(admin)/admin/users/_components/users-table.tsx
"use client";

import type { AdminUser } from "@/lib/db/admin-queries";
import { ShieldBan, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { unbanUser } from "../actions";
import BanModal from "./ban-modal";

/** Badge ruolo colorato — il colore viene passato dal server tramite roleColor */
function RoleBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: color + "18",
        color: color,
        border: `1px solid ${color}40`,
      }}>
      {label}
    </span>
  );
}

function PlanBadge({ status }: { status: string | null }) {
  const isPremium = status === "active";
  return (
    <span
      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        isPremium ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
      }`}>
      {isPremium ? "Premium" : "Free"}
    </span>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const [pending, startTransition] = useTransition();
  const [showBanModal, setShowBanModal] = useState(false);
  const isBanned = !!user.bannedAt;
  const isDeleted = !!user.deletedAt;
  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || user.email[0].toUpperCase();

  return (
    <tr
      className={`transition-colors ${
        isBanned || isDeleted ? "opacity-50" : ""
      }`}
      style={{ borderBottom: "1px solid var(--admin-divider)" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--admin-hover-bg)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }>

      {/* Avatar + nome */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: user.roleColor ?? "var(--admin-accent)" }}>
            {initials}
          </div>
          <div>
            <Link
              href={`/admin/users/${user.id}`}
              className="text-sm font-medium transition-colors leading-none admin-user-link"
              style={{ color: "var(--admin-text)" }}>
              {user.firstName} {user.lastName}
            </Link>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--admin-text-faint)" }}>
              {user.email}
            </p>
          </div>
        </div>
      </td>

      {/* Ruolo */}
      <td className="px-4 py-3">
        <RoleBadge
          label={user.roleLabel ?? user.role}
          color={user.roleColor ?? "#6b7280"}
        />
      </td>

      {/* Piano */}
      <td className="px-4 py-3">
        <PlanBadge status={user.subscriptionStatus} />
      </td>

      {/* Email verificata */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span
          className={`text-[11px] font-medium ${
            user.emailVerified ? "text-emerald-600" : ""
          }`}
          style={!user.emailVerified ? { color: "var(--admin-text-faint)" } : {}}>
          {user.emailVerified ? "✓ Verificata" : "Non verificata"}
        </span>
      </td>

      {/* Data iscrizione */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span
          className="text-xs"
          style={{ color: "var(--admin-text-faint)" }}>
          {new Date(user.createdAt).toLocaleDateString("it-IT")}
        </span>
      </td>

      {/* Azioni */}
      <td className="px-4 py-3">
        {user.isAdmin ? (
          <span
            className="text-xs italic"
            style={{ color: "var(--admin-text-faint)" }}>
            —
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {/* Ban / Unban */}
            {isBanned ? (
              <div className="flex items-center gap-2">
                {user.bannedReason && (
                  <div className="relative group">
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block w-max max-w-[220px]">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                        {user.bannedReason}
                      </div>
                      <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                    </div>
                    <span className="text-[11px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full cursor-help">
                      ⚠ motivo
                    </span>
                  </div>
                )}
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => unbanUser(user.id))}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                  <ShieldCheck size={13} /> Riattiva
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBanModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors bg-red-50 text-red-600 hover:bg-red-100">
                <ShieldBan size={13} /> Ban
              </button>
            )}
          </div>
        )}

        {showBanModal && (
          <BanModal
            userId={user.id}
            userName={initials}
            onClose={() => setShowBanModal(false)}
          />
        )}
      </td>
    </tr>
  );
}

export default function UsersTable({ users }: { users: AdminUser[] }) {
  if (users.length === 0) {
    return (
      <div
        className="text-center py-16 text-sm"
        style={{ color: "var(--admin-text-faint)" }}>
        Nessun utente trovato.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--admin-divider)" }}>
            {["Utente", "Ruolo", "Piano", "Email", "Iscritto il", "Azioni"].map(
              (h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide ${
                    i >= 3 && i <= 4 ? "hidden lg:table-cell" : ""
                  }`}
                  style={{ color: "var(--admin-text-faint)" }}>
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
