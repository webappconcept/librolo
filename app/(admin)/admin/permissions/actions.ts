// app/(admin)/admin/permissions/actions.ts
"use server";

import {
  addPermissionToRole,
  removePermissionFromRole,
} from "@/lib/rbac/permissions-queries";
import { db } from "@/lib/db/drizzle";
import { permissions, rolePermissions, userPermissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Toggle permesso su un ruolo (add / remove)
export async function toggleRolePermission(
  roleId: number,
  permissionId: number,
  granted: boolean,
) {
  if (granted) {
    await addPermissionToRole(roleId, permissionId);
  } else {
    await removePermissionFromRole(roleId, permissionId);
  }
  revalidatePath("/admin/permissions");
  revalidatePath("/admin/roles");
}

// Crea un nuovo permesso nel catalogo
const CreatePermissionSchema = z.object({
  key: z
    .string()
    .min(3)
    .regex(/^[a-z0-9_]+:[a-z0-9_]+$/, {
      message: 'Formato richiesto: risorsa:azione (es. "posts:publish")',
    }),
  label: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  group: z.string().min(1).max(100),
});

export async function createPermission(formData: FormData) {
  const parsed = CreatePermissionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { key, label, description, group } = parsed.data;

  const existing = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.key, key))
    .limit(1);

  if (existing.length > 0) {
    return { error: `Il permesso "${key}" esiste già.` };
  }

  await db.insert(permissions).values({ key, label, description, group });
  revalidatePath("/admin/permissions");
  return { success: true };
}

/**
 * Restituisce il numero di assegnazioni collegate a un permesso
 * (ruoli + override individuali). Usato dal dialog di conferma.
 */
export async function getPermissionImpact(permissionId: number) {
  const perm = await db
    .select({ isSystem: permissions.isSystem, key: permissions.key, label: permissions.label })
    .from(permissions)
    .where(eq(permissions.id, permissionId))
    .limit(1);

  if (!perm[0]) return { error: "Permesso non trovato." };
  if (perm[0].isSystem) return { error: "I permessi di sistema non possono essere eliminati." };

  const roleCount = await db
    .select({ id: rolePermissions.roleId })
    .from(rolePermissions)
    .where(eq(rolePermissions.permissionId, permissionId));

  const userCount = await db
    .select({ id: userPermissions.id })
    .from(userPermissions)
    .where(eq(userPermissions.permissionId, permissionId));

  return {
    key: perm[0].key,
    label: perm[0].label,
    roleAssignments: roleCount.length,
    userOverrides: userCount.length,
  };
}

/**
 * Elimina un permesso con cascade:
 * rimuove prima tutte le assegnazioni su ruoli e override individuali.
 */
export async function deletePermission(permissionId: number) {
  const perm = await db
    .select({ isSystem: permissions.isSystem })
    .from(permissions)
    .where(eq(permissions.id, permissionId))
    .limit(1);

  if (!perm[0] || perm[0].isSystem) {
    return { error: "I permessi di sistema non possono essere eliminati." };
  }

  // Cascade: rimuovi assegnazioni su ruoli
  await db.delete(rolePermissions).where(eq(rolePermissions.permissionId, permissionId));
  // Cascade: rimuovi override individuali
  await db.delete(userPermissions).where(eq(userPermissions.permissionId, permissionId));
  // Elimina il permesso
  await db.delete(permissions).where(eq(permissions.id, permissionId));

  revalidatePath("/admin/permissions");
  revalidatePath("/admin/users");
  return { success: true };
}
