// app/(admin)/admin/roles/actions.ts
"use server";

import { db } from "@/lib/db/drizzle";
import { getAdminRoles } from "@/lib/db/roles-queries";
import { activityLogs, ActivityType, roles, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/rbac/guards";
import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/** Scrive un record su activity_logs con IP del richiedente. */
async function logRbacAction(
  adminId: number,
  action: ActivityType,
  detail: string,
) {
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ??
    (await headers()).get("x-real-ip") ??
    null;

  await db.insert(activityLogs).values({
    userId: adminId,
    action: `${action} | ${detail}`,
    ipAddress: ip,
  });
}

const roleSchema = z.object({
  name: z
    .string()
    .min(2, "Minimo 2 caratteri")
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "Solo lettere minuscole, numeri, - e _"),
  label: z.string().min(2, "Minimo 2 caratteri").max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colore HEX non valido"),
  description: z.string().max(300).optional(),
  isAdmin: z.boolean().default(false),
  isStaff: z.boolean().default(false),
});

export async function createRole(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    label: formData.get("label"),
    color: formData.get("color"),
    description: formData.get("description") || undefined,
    isAdmin: formData.get("isAdmin") === "true",
    isStaff: formData.get("isStaff") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const allRoles = await getAdminRoles();
  const maxOrder = allRoles.reduce((m, r) => Math.max(m, r.sortOrder), 0);

  await db.insert(roles).values({
    ...parsed.data,
    isSystem: false,
    sortOrder: maxOrder + 1,
  });

  await logRbacAction(
    admin.id,
    ActivityType.ADMIN_CHANGE_ROLE,
    `create_role name=${parsed.data.name} label="${parsed.data.label}" isAdmin=${parsed.data.isAdmin}`,
  );

  revalidatePath("/admin/roles");
  return { success: "Ruolo creato" };
}

export async function updateRole(id: number, formData: FormData) {
  const admin = await requireAdmin();

  const [existing] = await db
    .select({ isSystem: roles.isSystem, name: roles.name })
    .from(roles)
    .where(eq(roles.id, id))
    .limit(1);

  if (!existing) return { error: "Ruolo non trovato" };

  const parsed = roleSchema.safeParse({
    name: existing.isSystem ? existing.name : formData.get("name"),
    label: formData.get("label"),
    color: formData.get("color"),
    description: formData.get("description") || undefined,
    isAdmin: formData.get("isAdmin") === "true",
    isStaff: formData.get("isStaff") === "true",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(roles)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(roles.id, id));

  // Sincronizza is_admin / is_staff su tutti gli utenti con questo ruolo
  await db
    .update(users)
    .set({
      isAdmin: parsed.data.isAdmin,
      isStaff: parsed.data.isStaff,
      updatedAt: new Date(),
    })
    .where(eq(users.role, parsed.data.name));

  await logRbacAction(
    admin.id,
    ActivityType.ADMIN_CHANGE_ROLE,
    `update_role name=${existing.name} label="${parsed.data.label}" isAdmin=${parsed.data.isAdmin} isStaff=${parsed.data.isStaff}`,
  );

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  return { success: "Ruolo aggiornato" };
}

export async function deleteRole(id: number) {
  const admin = await requireAdmin();

  const [existing] = await db
    .select({ isSystem: roles.isSystem, name: roles.name })
    .from(roles)
    .where(eq(roles.id, id))
    .limit(1);

  if (!existing) return { error: "Ruolo non trovato" };
  if (existing.isSystem) return { error: "I ruoli di sistema non possono essere eliminati" };

  // Riassegna gli utenti con questo ruolo a 'member'
  await db
    .update(users)
    .set({ role: "member", isAdmin: false, isStaff: false, updatedAt: new Date() })
    .where(and(eq(users.role, existing.name), ne(users.role, "member")));

  await db.delete(roles).where(eq(roles.id, id));

  await logRbacAction(
    admin.id,
    ActivityType.ADMIN_CHANGE_ROLE,
    `delete_role name=${existing.name}`,
  );

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  return { success: "Ruolo eliminato" };
}

export async function setUserRole(userId: number, roleName: string) {
  const admin = await requireAdmin();

  const [role] = await db
    .select({ isAdmin: roles.isAdmin, isStaff: roles.isStaff })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  if (!role) return { error: "Ruolo non trovato" };

  // Leggi il ruolo precedente per il log
  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  await db
    .update(users)
    .set({
      role: roleName,
      isAdmin: role.isAdmin,
      isStaff: role.isStaff,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logRbacAction(
    admin.id,
    ActivityType.ADMIN_CHANGE_ROLE,
    `set_user_role userId=${userId} from=${target?.role ?? "?"} to=${roleName}`,
  );

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: "Ruolo assegnato" };
}
