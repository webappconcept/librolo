/**
 * @deprecated lib/routes.ts
 *
 * Questo file è mantenuto SOLO come fallback statico nel middleware (proxy.ts).
 * La fonte di verità è ora la tabella `route_registry` su DB.
 * Gestione route: Admin → SEO → Route Registry (/admin/route-registry)
 *
 * NAV_ITEMS, USER_MENU_ITEMS e FOOTER_LINKS sono ancora usati dai componenti
 * di navigazione frontend fino a quando non verranno migrati a lettura da DB.
 * Non aggiungere nuove route qui.
 */

// Fallback statico per proxy.ts — NON modificare
export const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/admin/sign-in",
];

export const AUTH_ROUTES = ["/sign-in", "/sign-up"];

export const ADMIN_SIGNIN_ROUTE = "/admin/sign-in";

export const ADMIN_ROUTES = ["/admin"];

// Navigazione frontend — ancora in uso, migrazione pianificata
export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "Home" },
  { href: "/esplora", label: "Esplora", icon: "Search" },
  { href: "/libreria", label: "Libreria", icon: "BookOpen" },
] as const;

export const USER_MENU_ITEMS = [
  { href: "/profilo", label: "Profilo", icon: "User" },
  { href: "/account", label: "Impostazioni e privacy", icon: "Settings" },
  { href: "/assistenza", label: "Assistenza", icon: "HelpCircle" },
  { href: "/segnala", label: "Segnala un problema", icon: "AlertTriangle" },
] as const;

export const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/condizioni", label: "Condizioni" },
  { href: "/cookie", label: "Cookie" },
] as const;
