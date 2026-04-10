/**
 * ADMIN NAV REGISTRY
 *
 * Fonte di verità unica per tutta la navigazione del pannello admin.
 * Ogni voce dichiara:
 *  - href        : percorso della sezione
 *  - label       : testo nel menu
 *  - icon        : nome icona Lucide (stringa)
 *  - permission  : permesso RBAC richiesto per vedere/accedere alla voce
 *  - exact?      : true se il match dell'active state deve essere esatto
 *  - children?   : sottovoci (gruppo espandibile nella sidebar)
 *
 * La sidebar legge questo registro e filtra automaticamente le voci
 * in base al Set<string> dei permessi dell'utente corrente.
 *
 * Per aggiungere una nuova sezione:
 *  1. Aggiungi la voce qui
 *  2. Aggiungi il permesso in permissions-seed.ts ed esegui il seed
 *  3. Proteggi il layout/page con requireAdminSectionPage("permesso")
 *  4. Fine — sidebar, filtro e guard si aggiornano da soli
 */

export interface NavChild {
  href: string;
  label: string;
  icon: string;
  permission: string;
}

export interface NavItem {
  key: string;
  href?: string;
  label: string;
  icon: string;
  permission: string;
  exact?: boolean;
  children?: NavChild[];
  childrenMaxHeight?: string;
}

export const ADMIN_NAV: NavItem[] = [
  {
    key: "dashboard",
    href: "/admin",
    label: "Dashboard",
    icon: "LayoutDashboard",
    permission: "admin:access",
    exact: true,
  },
  {
    key: "utenti",
    label: "Utenti",
    icon: "Users",
    permission: "admin:users",
    childrenMaxHeight: "260px",
    children: [
      { href: "/admin/users",       label: "Gestione Utenti", icon: "Users",       permission: "admin:users" },
      { href: "/admin/staff",       label: "Gestione Staff",  icon: "UserCog",     permission: "admin:staff" },
      { href: "/admin/roles",       label: "Gestione Ruoli",  icon: "ShieldCheck", permission: "admin:roles" },
      { href: "/admin/permissions", label: "Permessi",        icon: "KeyRound",    permission: "admin:roles" },
    ],
  },
  {
    key: "content",
    href: "/admin/contenuti",
    label: "Contenuti",
    icon: "Layers",
    permission: "admin:content",
  },
  {
    key: "analytics",
    href: "/admin/analytics",
    label: "Analytics",
    icon: "BarChart2",
    permission: "admin:analytics",
  },
  {
    key: "moderation",
    href: "/admin/moderation",
    label: "Moderazione",
    icon: "ShieldAlert",
    permission: "admin:moderation",
  },
  {
    key: "seo",
    label: "SEO",
    icon: "Search",
    permission: "admin:seo",
    childrenMaxHeight: "160px",
    children: [
      { href: "/admin/seo/meta-tags", label: "Meta Tags", icon: "FileText", permission: "admin:seo" },
      { href: "/admin/seo/robots",    label: "Robots",    icon: "Globe",    permission: "admin:seo" },
      { href: "/admin/seo/sitemap",   label: "Sitemap",   icon: "Map",      permission: "admin:seo" },
    ],
  },
  {
    key: "settings",
    href: "/admin/settings",
    label: "Impostazioni",
    icon: "Settings",
    permission: "admin:settings",
  },
  {
    key: "logs",
    href: "/admin/logs",
    label: "Log attività",
    icon: "ClipboardList",
    permission: "admin:logs",
  },
];
