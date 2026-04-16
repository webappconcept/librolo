// app/(admin)/admin/users/actions.ts
"use server";

import { db } from "@/lib/db/drizzle";
import { roles, users, userProfiles, activityLogs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/rbac/guards";
import { can } from "@/lib/rbac/can";
import { ActivityType } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendUserDeletedEmail } from "@/lib/email/templates/user-deleted";

export async function banUser(userId: string, reason?: string) {
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

export async function unbanUser(userId: string) {
  await requireAdmin();
  await db
    .update(users)
    .set({ bannedAt: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const adminUser = await requireAdmin();

  const allowed = await can(adminUser, "users:delete");
  if (!allowed) throw new Error("Non hai il permesso users:delete.");

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: userProfiles.firstName,
      isAdmin: users.isAdmin,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const target = rows[0];
  if (!target) throw new Error("Utente non trovato.");
  if (target.isAdmin) throw new Error("Non puoi eliminare un account admin.");
  if (target.deletedAt) throw new Error("Utente già eliminato.");

  const deletedAt = new Date();

  await db
    .update(users)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(users.id, userId));

  await db.insert(activityLogs).values({
    userId: adminUser.id,
    action: ActivityType.ADMIN_DELETE_USER,
    timestamp: deletedAt,
  });

  try {
    await sendUserDeletedEmail(
      target.email,
      target.firstName ?? undefined,
      deletedAt,
    );
  } catch (emailError) {
    console.error("[deleteUser] Errore invio email:", emailError);
  }

  revalidatePath("/admin/users");
}

/** @deprecated Usa setUserRole in /admin/roles/actions.ts */
export async function changeUserRole(userId: string, roleName: string) {
  await requireAdmin();

  const [role] = await db
    .select({ isAdmin: roles.isAdmin })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  await db
    .update(users)
    .set({
      role: roleName,
      isAdmin: role?.isAdmin ?? false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin/users");
}
