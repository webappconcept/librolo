/**
 * lib/rbac/system-permissions.ts
 *
 * Source of truth di tutti i permessi hardcoded nel codice dell'app.
 * Usato per:
 *  - datalist autocomplete nel form "Nuovo permesso" del pannello admin
 *  - legenda visiva che documenta cosa fa ogni chiave
 *  - seed iniziale del DB (vedi lib/db/seed-permissions.ts)
 *
 * AGGIUNTA DI UN NUOVO PERMESSO:
 *  1. Aggiungilo qui nell'array corretto
 *  2. Usalo nel codice con can(user, "risorsa:azione")
 *  3. Nel pannello admin crea il permesso nel Catalogo con la stessa chiave
 */

export type SystemPermission = {
  /** Chiave usata nel codice: risorsa:azione */
  key: string;
  /** Etichetta human-readable */
  label: string;
  /** Gruppo per raggruppamento visivo */
  group: string;
  /** Spiegazione estesa dell'effetto */
  description: string;
};

export const SYSTEM_PERMISSIONS: SystemPermission[] = [
  // ── Admin ──────────────────────────────────────────────────────────
  {
    key: "admin:access",
    group: "Admin",
    label: "Accesso pannello admin",
    description:
      "Permette l'accesso al pannello /admin. Alternativo al flag is_admin.",
  },
  {
    key: "admin:settings",
    group: "Admin",
    label: "Modifica impostazioni globali",
    description: "Accesso alla sezione Impostazioni del pannello admin.",
  },

  // ── Gestione utenti ────────────────────────────────────────────────
  {
    key: "users:view",
    group: "Utenti",
    label: "Visualizza elenco utenti",
    description: "Lettura della lista utenti nel pannello admin.",
  },
  {
    key: "users:edit",
    group: "Utenti",
    label: "Modifica profilo utente",
    description: "Aggiornamento dei dati profilo di qualsiasi utente.",
  },
  {
    key: "users:delete",
    group: "Utenti",
    label: "Elimina utente",
    description: "Cancellazione soft (soft-delete) di un account utente.",
  },
  {
    key: "users:ban",
    group: "Utenti",
    label: "Banna / sbanna utente",
    description: "Imposta o rimuove bannedAt su un utente.",
  },
  {
    key: "users:impersonate",
    group: "Utenti",
    label: "Impersona utente",
    description: "Permette di agire come un altro utente per debug/supporto.",
  },

  // ── Ruoli & Permessi ───────────────────────────────────────────────
  {
    key: "roles:view",
    group: "Ruoli",
    label: "Visualizza ruoli",
    description: "Lettura della lista ruoli e matrice permessi.",
  },
  {
    key: "roles:edit",
    group: "Ruoli",
    label: "Crea / modifica ruoli",
    description: "Creazione e aggiornamento di ruoli nel sistema RBAC.",
  },
  {
    key: "roles:delete",
    group: "Ruoli",
    label: "Elimina ruoli",
    description: "Eliminazione di ruoli non di sistema.",
  },
  {
    key: "permissions:edit",
    group: "Ruoli",
    label: "Gestisci permessi",
    description: "Creazione, eliminazione e assegnazione permessi ai ruoli.",
  },

  // ── Contenuti / Post ───────────────────────────────────────────────
  {
    key: "posts:view",
    group: "Contenuti",
    label: "Visualizza post",
    description: "Lettura dei contenuti anche non pubblicati.",
  },
  {
    key: "posts:create",
    group: "Contenuti",
    label: "Crea post",
    description: "Creazione di nuovi contenuti in bozza.",
  },
  {
    key: "posts:edit",
    group: "Contenuti",
    label: "Modifica post",
    description: "Aggiornamento di post propri o altrui.",
  },
  {
    key: "posts:delete",
    group: "Contenuti",
    label: "Elimina post",
    description: "Cancellazione di post dal sistema.",
  },
  {
    key: "posts:publish",
    group: "Contenuti",
    label: "Pubblica post",
    description: "Pubblica contenuti senza approvazione editoriale.",
  },

  // ── SEO ────────────────────────────────────────────────────────────
  {
    key: "seo:view",
    group: "SEO",
    label: "Visualizza impostazioni SEO",
    description: "Lettura dei meta tag e JSON-LD configurati per le pagine.",
  },
  {
    key: "seo:edit",
    group: "SEO",
    label: "Modifica impostazioni SEO",
    description: "Aggiornamento di meta title, description, robots, JSON-LD.",
  },

  // ── Media ──────────────────────────────────────────────────────────
  {
    key: "media:upload",
    group: "Media",
    label: "Carica file",
    description: "Upload di immagini e file nella libreria media.",
  },
  {
    key: "media:delete",
    group: "Media",
    label: "Elimina file",
    description: "Rimozione di file dalla libreria media.",
  },

  // ── Email / Resend ─────────────────────────────────────────────────
  {
    key: "emails:send",
    group: "Email",
    label: "Invia email transazionali",
    description: "Invio manuale di email tramite Resend.",
  },
  {
    key: "emails:view_logs",
    group: "Email",
    label: "Visualizza log email",
    description: "Lettura dello storico email inviate.",
  },
];

/** Raggruppa SYSTEM_PERMISSIONS per group */
export function groupedSystemPermissions(): Map<string, SystemPermission[]> {
  const map = new Map<string, SystemPermission[]>();
  for (const p of SYSTEM_PERMISSIONS) {
    if (!map.has(p.group)) map.set(p.group, []);
    map.get(p.group)!.push(p);
  }
  return map;
}
