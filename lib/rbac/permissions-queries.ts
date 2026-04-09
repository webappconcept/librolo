/**
 * Query DB per la gestione RBAC nel pannello admin.
 */
import { db } from "@/lib/db/drizzle";
import {
  permissions,
  rolePermissions,
  userPermissions,
  roles,
  users,
} from "@/lib/db/schema";
import { and, eq, gt, isNull, or, desc, sql } from "drizzle-orm";

const USERS_WITH_PERMISSION_LIMIT = 200;

/** Tutti i permessi, ordinati per gruppo poi per key */
export async function getAllPermissions() {
  return db
    .select()
    .from(permissions)
    .orderBy(permissions.group, permissions.key);
}

/** Permessi assegnati a un ruolo specifico (per role.id) */
export async function getPermissionsByRole(roleId: number) {
  return db
    .select({ id: permissions.id, key: permissions.key, label: permissions.label, group: permissions.group })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId))
    .orderBy(permissions.group, permissions.key);
}

/** Override individuali di un utente (attivi e scaduti) */
export async function getUserPermissionOverrides(userId: number) {
  return db
    .select({
      id: userPermissions.id,
      permissionKey: permissions.key,
      permissionLabel: permissions.label,
      permissionGroup: permissions.group,
      granted: userPermissions.granted,
      reason: userPermissions.reason,
      expiresAt: userPermissions.expiresAt,
      createdAt: userPermissions.createdAt,
      updatedAt: userPermissions.updatedAt,
      grantedById: userPermissions.grantedBy,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId))
    .orderBy(desc(userPermissions.updatedAt));
}

/**
 * Lista utenti che hanno un dato permesso (via ruolo O override attivo).
 * Restituisce al massimo USERS_WITH_PERMISSION_LIMIT utenti.
 * Se il risultato è troncato, `truncated: true` viene incluso nella risposta.
 */
export async function getUsersWithPermission(permissionKey: string) {
  const now = new Date();

  // Via ruolo
  const viaRole = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      source: sql<string>`'role'`,
    })
    .from(users)
    .innerJoin(roles, eq(users.role, roles.name))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(permissions.key, permissionKey))
    .limit(USERS_WITH_PERMISSION_LIMIT);

  // Via override attivo granted=true
  const viaOverride = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      source: sql<string>`'override'`,
    })
    .from(userPermissions)
    .innerJoin(users, eq(userPermissions.userId, users.id))
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(
      and(
        eq(permissions.key, permissionKey),
        eq(userPermissions.granted, true),
        or(isNull(userPermissions.expiresAt), gt(userPermissions.expiresAt, now)),
      ),
    )
    .limit(USERS_WITH_PERMISSION_LIMIT);

  // Deduplicazione per id (override ha priorità)
  const map = new Map<number, (typeof viaRole)[0]>();
  for (const u of viaRole) map.set(u.id, u);
  for (const u of viaOverride) map.set(u.id, u);

  const all = Array.from(map.values());
  const truncated = all.length >= USERS_WITH_PERMISSION_LIMIT;

  return { users: all, truncated, limit: USERS_WITH_PERMISSION_LIMIT };
}

/** Aggiunge un permesso a un ruolo */
export async function addPermissionToRole(roleId: number, permissionId: number) {
  return db
    .insert(rolePermissions)
    .values({ roleId, permissionId })
    .onConflictDoNothing();
}

/** Rimuove un permesso da un ruolo */
export async function removePermissionFromRole(roleId: number, permissionId: number) {
  return db
    .delete(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId),
      ),
    );
}

/**
 * Aggiunge o aggiorna un override individuale (upsert).
 * Se esiste già un override per (userId, permissionId), aggiorna
 * granted / reason / expiresAt / grantedBy / updatedAt.
 * In questo modo non si creano mai righe duplicate per la stessa coppia.
 */
export async function addUserPermissionOverride(data: {
  userId: number;
  permissionId: number;
  granted: boolean;
  grantedBy: number;
  reason?: string;
  expiresAt?: Date | null;
}) {
  return db
    .insert(userPermissions)
    .values({ ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [userPermissions.userId, userPermissions.permissionId],
      set: {
        granted: data.granted,
        grantedBy: data.grantedBy,
        reason: data.reason ?? null,
        expiresAt: data.expiresAt ?? null,
        updatedAt: new Date(),
      },
    });
}

/** Rimuove un override individuale */
export async function removeUserPermissionOverride(overrideId: number) {
  return db.delete(userPermissions).where(eq(userPermissions.id, overrideId));
}
