// app/(admin)/admin/users/actions.ts
"use server";

import { db } from "@/lib/db/drizzle";
import { roles, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/rbac/guards";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function banUser(userId: number, reason?: string) {
  await requireAdmin();

  const [target] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (target?.isAdmin) {
    throw new Error("Non puoi sospendere un admin.");
  }

  await db
    .update(users)
    .set({ bannedAt: new Date(), bannedReason: reason ?? null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
}

export async function unbanUser(userId: number) {
  await requireAdmin();
  await db
    .update(users)
    .set({ bannedAt: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
}

/** @deprecated Usa setUserRole in /admin/roles/actions.ts */
export async function changeUserRole(userId: number, roleName: string) {
  await requireAdmin();

  const [role] = await db
    .select({ isAdmin: roles.isAdmin, isStaff: roles.isStaff })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  await db
    .update(users)
    .set({
      role: roleName,
      isAdmin: role?.isAdmin ?? false,
      isStaff: role?.isStaff ?? false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin/users");
}
