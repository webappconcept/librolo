// lib/routes.ts

export const PUBLIC_ROUTES = [
  "/",
  "/maintenance",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

// Route che un utente già loggato non dovrebbe vedere
export const AUTH_ROUTES = ["/sign-in", "/sign-up"];

// Navigazione principale — unica fonte di verità
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

export const ADMIN_ROUTES = ["/admin"];
