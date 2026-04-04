// components/app-nav.tsx
"use client";

import { signOut } from "@/app/(login)/actions";
import type { User as UserType } from "@/lib/db/schema";
import { fullName } from "@/lib/utils";
import { BookOpen, Home, LogOut, Search, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/esplora", icon: Search, label: "Esplora" },
  { href: "/libreria", icon: BookOpen, label: "Libreria" },
  { href: "/profilo", icon: User, label: "Profilo" },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useSWR<UserType>("/api/user", fetcher);

  async function handleSignOut() {
    await signOut();
    mutate("/api/user");
    router.push("/sign-in");
  }

  const initials = user?.firstName?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-brand-border bg-brand-surface">
        <div className="max-w-4xl mx-auto h-full px-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-bold text-lg text-brand-text tracking-tight">
            📚 Librolo
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      active
                        ? "bg-brand-bg text-brand-text"
                        : "text-brand-text-muted hover:text-brand-text hover:bg-brand-bg"
                    }`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
                ${
                  pathname.startsWith("/account")
                    ? "bg-brand-bg text-brand-text"
                    : "text-brand-text-muted hover:text-brand-text hover:bg-brand-bg"
                }`}>
              <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              {user && (
                <span className="hidden md:block text-sm font-medium text-brand-text">
                  {fullName(user)}
                </span>
              )}
            </Link>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
              aria-label="Esci">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 border-t border-brand-border bg-brand-surface flex items-center justify-around px-2">
        {[
          ...navItems,
          { href: "/account", icon: Settings, label: "Account" },
        ].map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors
                  ${active ? "text-brand-primary" : "text-brand-text-muted"}`}>
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
