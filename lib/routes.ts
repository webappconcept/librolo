/**
 * lib/routes.ts
 *
 * Fonte di verità per le route UI (nav, menu, footer) e per il
 * kernel di sicurezza del proxy.
 *
 * ─── ROUTING AUTH / VISIBILITY ────────────────────────────────────────
 * La logica public / private / admin / auth-only è gestita
 * esclusivamente dalla tabella `route_registry` su DB.
 * Proxy.ts legge il DB via getActiveRoutes() e usa queste costanti
 * SOLO come kernel di sicurezza per le route di sistema che non
 * possono dipendere dalla disponibilità del DB.
 *
 * ─── SISTEMA vs EDITORIALE ────────────────────────────────────────────
 * Le route di sistema (isSystemRoute = true nel DB) compaiono in
 * /admin/route-registry ma i campi pathname e visibility non sono
 * modificabili dall'admin. Solo label, meta tags e impostazioni
 * editoriali sono editabili.
 */

// ---------------------------------------------------------------------------
// KERNEL DI SICUREZZA — usato da proxy.ts
// Queste route sono gestite con logica hardcoded nel proxy PRIMA della
// lettura DB, per garantire che autenticazione e onboarding funzionino
// anche in caso di DB irraggiungibile o registry vuoto.
// ---------------------------------------------------------------------------

/**
 * Route di autenticazione: accessibili solo a utenti NON autenticati.
 * Se l'utente è loggato viene rediretto a /.
 * Corrispondono ai record con visibility = "auth-only" e isSystemRoute = true nel DB.
 */
export const SYSTEM_AUTH_ROUTES = ["/sign-in", "/sign-up"] as const;

/**
 * Route di sistema sempre pubbliche, bypass totale del DB registry.
 * Non richiedono sessione, non vengono mai bloccate dal proxy.
 * Corrispondono ai record con visibility = "public" e isSystemRoute = true nel DB.
 */
export const SYSTEM_ALWAYS_PUBLIC = [
  "/verify-email",
  "/forgot-password",
  "/reset-password",
] as const;

/**
 * Costante singola per la route di login admin.
 * Separata per evitare magic strings in proxy.ts e nei guard.
 */
export const ADMIN_SIGNIN_ROUTE = "/admin/sign-in" as const;

// ---------------------------------------------------------------------------
// NAVIGAZIONE FRONTEND — usati dai componenti UI
// Migrazione pianificata: in futuro verranno letti dal DB via
 // getNavRoutes() / getFooterRoutes() per permettere personalizzazione
// dall'admin senza deploy.
// ---------------------------------------------------------------------------

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
