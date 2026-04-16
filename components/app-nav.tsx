// components/app-nav.tsx
"use client";

import { signOut } from "@/app/(login)/actions";
import type { UserWithProfile } from "@/lib/db/schema";
import { FOOTER_LINKS, NAV_ITEMS, USER_MENU_ITEMS } from "@/lib/routes";
import { fullName } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Home,
  LogOut,
  Search,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const iconMap = {
  Home,
  Search,
  BookOpen,
  User,
  Settings,
  HelpCircle,
  AlertTriangle,
} as const;
type IconName = keyof typeof iconMap;

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: user } = useSWR<UserWithProfile>("/api/user", fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    shouldRetryOnError: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    mutate("/api/user");
    window.location.href = "/";
  }

  const initials = user?.firstName?.[0]?.toUpperCase() ?? "U";

  const avatarActive =
    dropdownOpen ||
    USER_MENU_ITEMS.some(({ href }) => pathname.startsWith(href));

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

          {/* Nav links desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, icon, label }) => {
              const Icon = iconMap[icon as IconName];
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

          {/* Avatar + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
                ${
                  avatarActive
                    ? "bg-brand-bg text-brand-text"
                    : "text-brand-text-muted hover:text-brand-text hover:bg-brand-bg"
                }`}>
              <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                {initials}
              </div>
            </button>

            {/* Dropdown desktop only */}
            {dropdownOpen && (
              <div className="hidden md:block absolute right-0 mt-2 w-64 rounded-xl border border-brand-border bg-brand-surface shadow-lg py-1 z-50">
                {/* Profilo */}
                <Link
                  href={USER_MENU_ITEMS[0].href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-brand-bg transition-colors rounded-t-xl">
                  <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-brand-text">
                      {fullName(user)}
                    </span>
                    <span className="text-xs text-brand-text-muted">
                      Vedi il tuo profilo
                    </span>
                  </div>
                </Link>

                <div className="my-1 border-t border-brand-border" />

                {/* Voci menu */}
                {USER_MENU_ITEMS.slice(1).map(({ href, icon, label }) => {
                  const Icon = iconMap[icon as IconName];
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-text hover:bg-brand-bg transition-colors">
                      <Icon className="h-4 w-4 text-brand-text-muted shrink-0" />
                      {label}
                    </Link>
                  );
                })}

                <div className="my-1 border-t border-brand-border" />

                {/* Esci */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-brand-bg transition-colors">
                  <LogOut className="h-4 w-4 shrink-0" />
                  Esci
                </button>

                <div className="my-1 border-t border-brand-border" />

                {/* Footer links */}
                <div className="flex flex-wrap gap-x-2 gap-y-1 px-4 py-2">
                  {FOOTER_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="text-xs text-brand-text-muted hover:text-brand-text transition-colors">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Overlay mobile */}
      {dropdownOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setDropdownOpen(false)}
        />
      )}

      {/* Bottom sheet mobile */}
      <div
        className={`md:hidden fixed bottom-16 inset-x-0 z-50 bg-brand-surface rounded-t-2xl border-t border-brand-border transition-transform duration-300 ease-out
  ${dropdownOpen ? "translate-y-0" : "translate-y-full"}`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-brand-border" />
        </div>

        {/* Profilo */}
        <Link
          href={USER_MENU_ITEMS[0].href}
          className="flex items-center gap-3 px-5 py-4 hover:bg-brand-bg transition-colors">
          <div className="w-11 h-11 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold shrink-0">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-brand-text">
              {fullName(user)}
            </span>
            <span className="text-sm text-brand-text-muted">
              Vedi il tuo profilo
            </span>
          </div>
        </Link>

        <div className="border-t border-brand-border" />

        {/* Voci menu */}
        {USER_MENU_ITEMS.slice(1).map(({ href, icon, label }) => {
          const Icon = iconMap[icon as IconName];
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 px-5 py-3.5 text-base text-brand-text hover:bg-brand-bg transition-colors">
              <Icon className="h-5 w-5 text-brand-text-muted shrink-0" />
              {label}
            </Link>
          );
        })}

        <div className="border-t border-brand-border" />

        {/* Esci */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 px-5 py-3.5 text-base text-red-500 hover:bg-brand-bg transition-colors">
          <LogOut className="h-5 w-5 shrink-0" />
          Esci
        </button>

        {/* Footer links */}
        <div className="flex gap-3 px-5 py-3">
          {FOOTER_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs text-brand-text-muted hover:text-brand-text transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 border-t border-brand-border bg-brand-surface flex items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const Icon = iconMap[icon as IconName];
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
