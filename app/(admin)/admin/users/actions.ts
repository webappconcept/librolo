// app/(admin)/admin/users/actions.ts
"use server";

import { db } from "@/lib/db/drizzle";
import { getUser } from "@/lib/db/queries";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const user = await getUser();
  if (!user || user.role !== "admin") throw new Error("Non autorizzato");
  return user;
}

export async function banUser(userId: number, reason?: string) {
  await requireAdmin();

  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (target?.role === "admin") {
    throw new Error("Non puoi sospendere un admin.");
  }

  await db
    .update(users)
    .set({
      bannedAt: new Date(),
      bannedReason: reason ?? null,
      updatedAt: new Date(),
    })
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

export async function changeUserRole(userId: number, role: string) {
  await requireAdmin();
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
}
