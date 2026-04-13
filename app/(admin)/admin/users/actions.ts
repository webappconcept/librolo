// app/(admin)/admin/users/actions.ts
"use server";

import { db } from "@/lib/db/drizzle";
import { roles, users, activityLogs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/rbac/guards";
import { can } from "@/lib/rbac/can";
import { ActivityType } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import UserDeletedEmail from "@/emails/user-deleted";

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function deleteUser(userId: number) {
  // 1. Guard base: deve essere admin
  const adminUser = await requireAdmin();

  // 2. Guard granulare: deve avere users:delete (RBAC)
  const allowed = await can(adminUser, "users:delete");
  if (!allowed) throw new Error("Non hai il permesso users:delete.");

  // 3. Fetch target
  const [target] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      isAdmin: users.isAdmin,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) throw new Error("Utente non trovato.");
  if (target.isAdmin) throw new Error("Non puoi eliminare un account admin.");
  if (target.deletedAt) throw new Error("Utente già eliminato.");

  const deletedAt = new Date();

  // 4. Soft delete
  await db
    .update(users)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(users.id, userId));

  // 5. Activity log
  await db.insert(activityLogs).values({
    userId: adminUser.id,
    action: ActivityType.ADMIN_DELETE_USER,
    timestamp: deletedAt,
  });

  // 6. Email notifica all'utente eliminato
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@librolo.it",
      to: target.email,
      subject: "Il tuo account Librolo è stato eliminato",
      react: UserDeletedEmail({
        firstName: target.firstName ?? "Utente",
        deletedAt,
      }),
    });
  } catch (emailError) {
    // Non bloccare l'operazione se l'email fallisce
    console.error("[deleteUser] Errore invio email Resend:", emailError);
  }

  revalidatePath("/admin/users");
}

/** @deprecated Usa setUserRole in /admin/roles/actions.ts */
export async function changeUserRole(userId: number, roleName: string) {
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
