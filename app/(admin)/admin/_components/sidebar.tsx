"use client";

import {
  BarChart2,
  BookOpen,
  LayoutDashboard,
  Search,
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
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/seo", label: "SEO", icon: Search },
  { href: "/admin/settings", label: "Impostazioni", icon: Settings },
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
    <aside
      className="w-[var(--admin-sidebar-width)] h-full flex flex-col"
      style={{
        background: "var(--admin-sidebar-bg)",
        color: "var(--admin-sidebar-text-active)",
      }}>
      {/* Logo */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid var(--admin-sidebar-border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--admin-accent)" }}>
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide">{appName}</span>
            <span
              className="block text-[10px] uppercase tracking-widest"
              style={{ color: "var(--admin-sidebar-text-faint)" }}>
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
              (e.currentTarget.style.background =
                "var(--admin-sidebar-item-hover-bg)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }>
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: active
                  ? "var(--admin-sidebar-item-active-bg)"
                  : "transparent",
                color: active
                  ? "var(--admin-sidebar-text-active)"
                  : "var(--admin-sidebar-text)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background =
                    "var(--admin-sidebar-item-hover-bg)";
                  e.currentTarget.style.color =
                    "var(--admin-sidebar-text-active)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--admin-sidebar-text)";
                }
              }}>
              <Icon
                size={18}
                style={{
                  color: active
                    ? "var(--admin-accent)"
                    : "var(--admin-sidebar-icon-inactive)",
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
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid var(--admin-sidebar-border)" }}>
        <Link
          href="/"
          className="text-xs transition-colors"
          style={{ color: "var(--admin-sidebar-text-faint)" }}>
          ← Torna all’app
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex shrink-0 h-full">{content}</div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[var(--admin-sidebar-width)] lg:hidden">
            {content}
          </div>
        </>
      )}
    </>
  );
}
