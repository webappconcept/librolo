// app/(admin)/admin/_components/header.tsx
import { User } from "@/lib/db/schema";
import { Bell } from "lucide-react";

export default function AdminHeaderRight({ user }: { user: User }) {
  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || "A";

  return (
    <div className="flex items-center gap-3">
      <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
        <Bell size={18} />
      </button>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#e07a3a] flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-gray-800 leading-none">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-[10px] text-[#e07a3a] font-medium mt-0.5 uppercase tracking-wide">
            Admin
          </p>
        </div>
      </div>
    </div>
  );
}
