/**
 * Seed dei permessi base del sistema RBAC.
 * Eseguire una volta dopo la migrazione:
 *   npx tsx lib/db/permissions-seed.ts
 *
 * Ruoli di sistema: SOLO "admin" e "member".
 *  - admin  : super admin con isAdmin=true, accesso completo
 *  - member : ruolo default per ogni nuovo utente registrato
 *
 * Tutti gli altri ruoli (es. editor, supporto, moderatore)
 * si creano dall'UI /admin/roles assegnando i permessi granulari RBAC.
 */
import { db } from "./drizzle";
import { permissions, roles, rolePermissions } from "./schema";
import { eq } from "drizzle-orm";

const PERMISSIONS_SEED = [
  // ── Admin ────────────────────────────────────────────────────────
  { key: "admin:access",    label: "Accedere al pannello admin",      group: "Admin",      isSystem: true },
  { key: "admin:settings",  label: "Modificare impostazioni app",     group: "Admin",      isSystem: true },
  { key: "admin:analytics", label: "Visualizzare analytics",          group: "Admin",      isSystem: true },
  { key: "admin:seo",       label: "Gestire SEO",                     group: "Admin",      isSystem: true },

  // ── Utenti ─────────────────────────────────────────────────────
  { key: "users:read",              label: "Visualizzare lista utenti",         group: "Utenti", isSystem: true },
  { key: "users:edit",              label: "Modificare profili altrui",         group: "Utenti", isSystem: true },
  { key: "users:delete",            label: "Eliminare account altrui",          group: "Utenti", isSystem: true },
  { key: "users:ban",               label: "Sospendere utenti",                 group: "Utenti", isSystem: true },
  { key: "users:role_assign",       label: "Assegnare ruoli",                   group: "Utenti", isSystem: true },
  { key: "users:permission_assign", label: "Assegnare permessi individuali",    group: "Utenti", isSystem: true },

  // ── Moderazione ──────────────────────────────────────────────
  { key: "moderation:read", label: "Visualizzare segnalazioni", group: "Moderazione", isSystem: true },
  { key: "moderation:act",  label: "Gestire segnalazioni",      group: "Moderazione", isSystem: true },

  // ── Contenuti (generici — personalizzare per l'app) ───────────────────
  { key: "content:read",       label: "Leggere contenuti",                  group: "Contenuti", isSystem: false },
  { key: "content:create",     label: "Creare contenuti",                   group: "Contenuti", isSystem: false },
  { key: "content:edit_own",   label: "Modificare propri contenuti",        group: "Contenuti", isSystem: false },
  { key: "content:edit_any",   label: "Modificare qualsiasi contenuto",     group: "Contenuti", isSystem: false },
  { key: "content:delete_own", label: "Eliminare propri contenuti",         group: "Contenuti", isSystem: false },
  { key: "content:delete_any", label: "Eliminare qualsiasi contenuto",      group: "Contenuti", isSystem: false },
  { key: "content:publish",    label: "Pubblicare senza approvazione",      group: "Contenuti", isSystem: false },

  // ── Profilo ──────────────────────────────────────────────────────
  { key: "profile:read",   label: "Visualizzare il proprio profilo", group: "Profilo", isSystem: false },
  { key: "profile:edit",   label: "Modificare il proprio profilo",   group: "Profilo", isSystem: false },
  { key: "profile:export", label: "Esportare i propri dati",         group: "Profilo", isSystem: false },
] as const;

/**
 * Solo i due ruoli di sistema ricevono permessi dal seed.
 * Tutti gli altri ruoli si gestiscono dall'UI /admin/roles.
 */
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: [
    "admin:access", "admin:settings", "admin:analytics", "admin:seo",
    "users:read", "users:edit", "users:delete", "users:ban",
    "users:role_assign", "users:permission_assign",
    "moderation:read", "moderation:act",
    "content:read", "content:create", "content:edit_own", "content:edit_any",
    "content:delete_own", "content:delete_any", "content:publish",
    "profile:read", "profile:edit", "profile:export",
  ],
  member: [
    "content:read", "content:create",
    "content:edit_own", "content:delete_own",
    "profile:read", "profile:edit", "profile:export",
  ],
};

async function seed() {
  console.log("🌱 Seed permessi RBAC...");

  // 1. Inserisce/aggiorna tutti i permessi
  for (const p of PERMISSIONS_SEED) {
    await db
      .insert(permissions)
      .values({ key: p.key, label: p.label, group: p.group, isSystem: p.isSystem })
      .onConflictDoUpdate({
        target: permissions.key,
        set: { label: p.label, group: p.group },
      });
  }
  console.log(`  ✓ ${PERMISSIONS_SEED.length} permessi inseriti/aggiornati`);

  // 2. Per ogni ruolo nel map, assegna i permessi
  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = await db.query.roles.findFirst({ where: eq(roles.name, roleName) });
    if (!role) {
      console.warn(`  ⚠ Ruolo "${roleName}" non trovato — skip`);
      continue;
    }

    for (const key of permKeys) {
      const perm = await db.query.permissions.findFirst({ where: eq(permissions.key, key) });
      if (!perm) { console.warn(`  ⚠ Permesso "${key}" non trovato — skip`); continue; }

      await db
        .insert(rolePermissions)
        .values({ roleId: role.id, permissionId: perm.id })
        .onConflictDoNothing();
    }
    console.log(`  ✓ Ruolo "${roleName}": ${permKeys.length} permessi assegnati`);
  }

  console.log("✅ Seed completato.");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
