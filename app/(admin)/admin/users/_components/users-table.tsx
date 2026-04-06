// app/(admin)/admin/users/_components/users-table.tsx
"use client";

import type { AdminUser } from "@/lib/db/admin-queries";
import { ChevronDown, ShieldBan, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { changeUserRole, unbanUser } from "../actions";
import BanModal from "./ban-modal";

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    owner: "bg-blue-100 text-blue-700",
    member: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${map[role] ?? map.member}`}>
      {role}
    </span>
  );
}

function PlanBadge({ status }: { status: string | null }) {
  const isPremium = status === "active";
  return (
    <span
      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        isPremium
          ? "bg-orange-100 text-orange-700"
          : "bg-gray-100 text-gray-500"
      }`}>
      {isPremium ? "Premium" : "Free"}
    </span>
  );
}

function RoleDropdown({
  userId,
  currentRole,
}: {
  userId: number;
  currentRole: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="inline-flex items-center gap-1">
      <RoleBadge role={currentRole} />
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-0.5 rounded transition-colors"
        style={{ color: "var(--admin-text-faint)" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--admin-hover-bg)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }>
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 rounded-lg shadow-lg min-w-[120px] overflow-hidden"
            style={{
              top: pos.top,
              left: pos.left,
              background: "var(--admin-card-bg)",
              border: "1px solid var(--admin-card-border)",
            }}>
            {["member", "owner", "admin"].map((r) => (
              <button
                key={r}
                disabled={pending || r === currentRole}
                onClick={() => {
                  setOpen(false);
                  startTransition(() => changeUserRole(userId, r));
                }}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: "var(--admin-text)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--admin-hover-bg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }>
                {r}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const [pending, startTransition] = useTransition();
  const [showBanModal, setShowBanModal] = useState(false);
  const isBanned = !!user.bannedAt;
  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || user.email[0].toUpperCase();

  return (
    <tr
      className={`transition-colors ${isBanned ? "opacity-50" : ""}`}
      style={{ borderBottom: "1px solid var(--admin-divider)" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--admin-hover-bg)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      {/* Avatar + nome */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "var(--admin-accent)" }}>
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
        <RoleDropdown userId={user.id} currentRole={user.role} />
      </td>

      {/* Piano */}
      <td className="px-4 py-3">
        <PlanBadge status={user.subscriptionStatus} />
      </td>

      {/* Email verificata */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span
          className={`text-[11px] font-medium ${user.emailVerified ? "text-emerald-600" : ""}`}
          style={
            !user.emailVerified ? { color: "var(--admin-text-faint)" } : {}
          }>
          {user.emailVerified ? "✓ Verificata" : "Non verificata"}
        </span>
      </td>

      {/* Data iscrizione */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs" style={{ color: "var(--admin-text-faint)" }}>
          {new Date(user.createdAt).toLocaleDateString("it-IT")}
        </span>
      </td>

      {/* Azioni */}
      <td className="px-4 py-3">
        {user.role === "admin" ? (
          <span
            className="text-xs italic"
            style={{ color: "var(--admin-text-faint)" }}>
            —
          </span>
        ) : isBanned ? (
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
              ),
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
