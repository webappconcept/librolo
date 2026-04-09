"use client";

import {
  BarChart2,
  BookOpen,
  ChevronDown,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_TOP = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
];

const USERS_SUB = [
  { href: "/admin/users", label: "Gestione Utenti", icon: Users },
  { href: "/admin/roles", label: "Gestione Ruoli", icon: ShieldCheck },
  { href: "/admin/permissions", label: "Permessi", icon: KeyRound },
];

const NAV_BOTTOM = [
  { href: "/admin/moderation", label: "Moderazione", icon: ShieldAlert },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/seo", label: "SEO", icon: Search },
  { href: "/admin/settings", label: "Impostazioni", icon: Settings },
  { href: "/admin/logs", label: "Log attività", icon: ClipboardList },
];

interface AdminSidebarProps {
  appName: string;
  open?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ appName, open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const usersGroupActive =
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/roles") ||
    pathname.startsWith("/admin/permissions");
  const [usersOpen, setUsersOpen] = useState(usersGroupActive);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function NavLink({
    href,
    label,
    icon: Icon,
    exact,
    sub,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
    exact?: boolean;
    sub?: boolean;
  }) {
    const active = isActive(href, exact);
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
          sub ? "px-3 py-2 ml-3" : "px-3 py-2.5"
        }`}
        style={{
          background: active ? "var(--admin-sidebar-item-active-bg)" : "transparent",
          color: active ? "var(--admin-sidebar-text-active)" : "var(--admin-sidebar-text)",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = "var(--admin-sidebar-item-hover-bg)";
            e.currentTarget.style.color = "var(--admin-sidebar-text-active)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--admin-sidebar-text)";
          }
        }}
      >
        <Icon
          size={sub ? 15 : 18}
          style={{
            color: active ? "var(--admin-accent)" : "var(--admin-sidebar-icon-inactive)",
          }}
        />
        {label}
        {active && (
          <span
            className="ml-auto w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--admin-accent)" }}
          />
        )}
      </Link>
    );
  }

  const content = (
    <aside
      className="w-[var(--admin-sidebar-width)] h-full flex flex-col"
      style={{ background: "var(--admin-sidebar-bg)", color: "var(--admin-sidebar-text-active)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid var(--admin-sidebar-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--admin-accent)" }}
          >
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide">{appName}</span>
            <span
              className="block text-[10px] uppercase tracking-widest"
              style={{ color: "var(--admin-sidebar-text-faint)" }}
            >
              Admin Panel
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg transition-colors"
            style={{ color: "var(--admin-sidebar-text)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--admin-sidebar-item-hover-bg)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_TOP.map(({ href, label, icon, exact }) => (
          <NavLink key={href} href={href} label={label} icon={icon} exact={exact} />
        ))}

        {/* Gruppo espandibile Utenti */}
        <div>
          <button
            onClick={() => setUsersOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background:
                usersGroupActive && !usersOpen
                  ? "var(--admin-sidebar-item-active-bg)"
                  : "transparent",
              color: usersGroupActive
                ? "var(--admin-sidebar-text-active)"
                : "var(--admin-sidebar-text)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--admin-sidebar-item-hover-bg)";
              e.currentTarget.style.color = "var(--admin-sidebar-text-active)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                usersGroupActive && !usersOpen
                  ? "var(--admin-sidebar-item-active-bg)"
                  : "transparent";
              e.currentTarget.style.color = usersGroupActive
                ? "var(--admin-sidebar-text-active)"
                : "var(--admin-sidebar-text)";
            }}
          >
            <Users
              size={18}
              style={{
                color: usersGroupActive
                  ? "var(--admin-accent)"
                  : "var(--admin-sidebar-icon-inactive)",
              }}
            />
            <span className="flex-1 text-left">Utenti</span>
            <ChevronDown
              size={15}
              className="transition-transform duration-200"
              style={{
                transform: usersOpen ? "rotate(180deg)" : "rotate(0deg)",
                color: "var(--admin-sidebar-icon-inactive)",
              }}
            />
          </button>

          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: usersOpen ? "180px" : "0px", opacity: usersOpen ? 1 : 0 }}
          >
            <div className="mt-0.5 space-y-0.5 pb-0.5">
              {USERS_SUB.map(({ href, label, icon }) => (
                <NavLink key={href} href={href} label={label} icon={icon} sub />
              ))}
            </div>
          </div>
        </div>

        {NAV_BOTTOM.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid var(--admin-sidebar-border)" }}>
        <Link
          href="/"
          className="text-xs transition-colors"
          style={{ color: "var(--admin-sidebar-text-faint)" }}
        >
          ← Torna all&apos;app
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex shrink-0 h-full">{content}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 z-50 w-[var(--admin-sidebar-width)] lg:hidden">
            {content}
          </div>
        </>
      )}
    </>
  );
}
