// app/(admin)/admin/staff/actions.ts
"use server";

import { db } from "@/lib/db/drizzle";
import { roles, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/rbac/guards";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function changeStaffRole(userId: number, roleName: string) {
  await requireAdmin();

  const [role] = await db
    .select({ isAdmin: roles.isAdmin })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  if (!role) throw new Error("Ruolo non trovato.");
  if (!role.isAdmin) {
    throw new Error("Puoi assegnare solo ruoli con flag Amministratore.");
  }

  await db
    .update(users)
    .set({
      role: roleName,
      isAdmin: role.isAdmin ?? false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin/staff");
}
