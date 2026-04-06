// app/(admin)/admin/_components/header.tsx
"use client";

import { signOut } from "@/app/(login)/actions";
import { User } from "@/lib/db/schema";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function AdminHeaderRight({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || "A";

  // Chiudi cliccando fuori
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Bell */}
      <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
        <Bell size={18} />
      </button>

      {/* Avatar + dropdown */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#e07a3a] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-gray-800 leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[10px] text-[#e07a3a] font-medium mt-0.5 uppercase tracking-wide">
              Admin
            </p>
          </div>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform hidden sm:block ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {/* Info utente */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {user.email}
              </p>
            </div>

            {/* Logout */}
            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={15} />
                Esci
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
