import {
  BarChart2,
  BookOpen,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Utenti", icon: Users },
  { href: "/admin/moderation", label: "Moderazione", icon: ShieldAlert },
  { href: "/admin/settings", label: "Impostazioni", icon: Settings },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
];

interface AdminSidebarProps {
  appName: string;
  open?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({
  appName,
  open,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const content = (
    <aside className="w-64 h-full bg-[#1c2434] text-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "#e07a3a" }}>
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide">{appName}</span>
            <span className="block text-[10px] text-white/40 uppercase tracking-widest">
              Admin Panel
            </span>
          </div>
        </div>
        {/* Chiudi drawer su mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}>
              <Icon
                size={18}
                className={active ? "text-[#e07a3a]" : "text-white/40"}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#e07a3a]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <Link
          href="/"
          className="text-xs text-white/30 hover:text-white/60 transition-colors">
          ← Torna all'app
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop — sempre visibile */}
      <div className="hidden lg:flex shrink-0 h-full">{content}</div>

      {/* Mobile — drawer overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            {content}
          </div>
        </>
      )}
    </>
  );
}
