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
 *  - comingSoon? : true = voce visibile ma disabilitata (badge "Prossimamente")
 *
 * La sidebar legge questo registro e filtra automaticamente le voci
 * in base al Set<string> dei permessi dell'utente corrente.
 *
 * Per aggiungere una nuova sezione:
 *  1. Aggiungi la voce qui (rimuovi comingSoon quando pronta)
 *  2. Aggiungi il permesso in permissions-seed.ts ed esegui il seed
 *  3. Crea app/(admin)/admin/<sezione>/layout.tsx con requireAdminSectionPage()
 *  4. Fine — sidebar, filtro e guard si aggiornano da soli
 */

export interface NavChild {
  href: string;
  label: string;
  icon: string;
  permission: string;
  comingSoon?: boolean;
}

export interface NavItem {
  key: string;
  href?: string;
  label: string;
  icon: string;
  permission: string;
  exact?: boolean;
  comingSoon?: boolean;
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
    key: "users",
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
    label: "Contenuti",
    icon: "Layers",
    permission: "admin:content",
    childrenMaxHeight: "160px",
    children: [
      { href: "/admin/contenuti", label: "Pagine",    icon: "FileText",   permission: "admin:content" },
      { href: "/admin/template",  label: "Template",  icon: "PanelTop",   permission: "admin:content" },
      { href: "/admin/redirect",  label: "Redirect",  icon: "ArrowRight", permission: "admin:content" },
    ],
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
    key: "billing",
    label: "Billing & Pagamenti",
    icon: "CreditCard",
    permission: "admin:billing",
    comingSoon: true,
    childrenMaxHeight: "220px",
    children: [
      { href: "/admin/billing",              label: "Panoramica",        icon: "LayoutDashboard", permission: "admin:billing",           comingSoon: true },
      { href: "/admin/billing/plans",        label: "Piani",             icon: "PackageCheck",    permission: "billing:manage_plans",    comingSoon: true },
      { href: "/admin/billing/transactions", label: "Transazioni",       icon: "ArrowLeftRight",  permission: "billing:view_transactions", comingSoon: true },
      { href: "/admin/billing/subscriptions",label: "Abbonamenti",       icon: "RefreshCcw",      permission: "subscriptions:manage",    comingSoon: true },
      { href: "/admin/billing/gateways",     label: "Gateway (Stripe…)", icon: "Plug",            permission: "billing:manage_gateways", comingSoon: true },
    ],
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
