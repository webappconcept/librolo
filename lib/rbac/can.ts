/**
 * Helper RBAC — can(user, permissionKey)
 *
 * Risoluzione in ordine di priorità:
 *  1. Override individuale non scaduto (user_permissions) → usa granted
 *  2. Permesso nel ruolo dell'utente (role_permissions)  → true
 *  3. Default                                             → false
 *
 * Uso in Server Action o Route Handler:
 *   const allowed = await can(user, "content:publish")
 *   if (!allowed) throw new Error("Non autorizzato")
 *
 * Uso in layout (batch, una sola query):
 *   const perms = await getUserPermissions(userId, roleName)
 *   perms.has("admin:access") // → boolean
 */
import { db } from "@/lib/db/drizzle";
import { permissions, rolePermissions, userPermissions, roles } from "@/lib/db/schema";
import { and, eq, gt, isNull, or } from "drizzle-orm";

type UserLike = { id: number; role: string };

/**
 * Controlla un singolo permesso per un utente.
 * Ottimizzato per chiamate singole in Server Actions.
 */
export async function can(user: UserLike, permissionKey: string): Promise<boolean> {
  const now = new Date();

  // 1. Override individuale (non scaduto)
  const override = await db
    .select({ granted: userPermissions.granted })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(
      and(
        eq(userPermissions.userId, user.id),
        eq(permissions.key, permissionKey),
        or(
          isNull(userPermissions.expiresAt),
          gt(userPermissions.expiresAt, now),
        ),
      ),
    )
    .limit(1);

  if (override.length > 0) return override[0].granted;

  // 2. Permesso del ruolo
  const roleMatch = await db
    .select({ id: rolePermissions.permissionId })
    .from(rolePermissions)
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        eq(roles.name, user.role),
        eq(permissions.key, permissionKey),
      ),
    )
    .limit(1);

  return roleMatch.length > 0;
}

/**
 * Restituisce il Set completo dei permessi attivi per un utente.
 * Da usare nei layout (Server Component) per evitare N query:
 *   const perms = await getUserPermissions(user)
 *   // poi passa perms come prop ai Client Components
 */
export async function getUserPermissions(user: UserLike): Promise<Set<string>> {
  const now = new Date();

  // Permessi dal ruolo
  const rolePerms = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(roles.name, user.role));

  const set = new Set(rolePerms.map((p) => p.key));

  // Override individuali (non scaduti)
  const overrides = await db
    .select({ key: permissions.key, granted: userPermissions.granted })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(
      and(
        eq(userPermissions.userId, user.id),
        or(
          isNull(userPermissions.expiresAt),
          gt(userPermissions.expiresAt, now),
        ),
      ),
    );

  // Gli override vincono sul ruolo
  for (const o of overrides) {
    if (o.granted) set.add(o.key);
    else set.delete(o.key);
  }

  return set;
}
