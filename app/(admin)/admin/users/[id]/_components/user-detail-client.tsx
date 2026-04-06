"use client";

import type { AdminUserDetail } from "@/lib/db/admin-queries";
import { ShieldBan, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import BanModal from "../../_components/ban-modal";
import { banUser, changeUserRole, unbanUser } from "../../actions";

export function BanButton({ user }: { user: AdminUserDetail }) {
  const [showModal, setShowModal] = useState(false);
  const [pending, startTransition] = useTransition();
  const isBanned = !!user.bannedAt;
  const userName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  if (user.role === "admin") {
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
        <BanModal
          userId={user.id}
          userName={userName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export function RoleSelector({ user }: { user: AdminUserDetail }) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(user.role);

  return (
    <div className="flex items-center gap-2">
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const newRole = e.target.value;
          setCurrent(newRole);
          startTransition(() => changeUserRole(user.id, newRole));
        }}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e07a3a]/30 bg-white text-gray-700 disabled:opacity-50">
        {["member", "owner", "admin"].map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {pending && (
        <div className="w-3.5 h-3.5 border-2 border-[#e07a3a] border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
