// app/(admin)/admin/permissions/actions.ts
"use server";

import {
  addPermissionToRole,
  removePermissionFromRole,
} from "@/lib/rbac/permissions-queries";
import { db } from "@/lib/db/drizzle";
import { permissions } from "@/lib/db/schema";
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

// Elimina un permesso (solo non-system)
export async function deletePermission(permissionId: number) {
  const perm = await db
    .select({ isSystem: permissions.isSystem })
    .from(permissions)
    .where(eq(permissions.id, permissionId))
    .limit(1);

  if (!perm[0] || perm[0].isSystem) {
    return { error: "I permessi di sistema non possono essere eliminati." };
  }

  await db.delete(permissions).where(eq(permissions.id, permissionId));
  revalidatePath("/admin/permissions");
  return { success: true };
}
