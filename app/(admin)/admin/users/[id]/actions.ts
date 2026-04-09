// app/(admin)/admin/users/[id]/actions.ts
"use server";

import {
  addUserPermissionOverride,
  removeUserPermissionOverride,
  purgeExpiredOverrides,
} from "@/lib/rbac/permissions-queries";
import { getUser } from "@/lib/db/queries";
import { activityLogs, ActivityType, permissions } from "@/lib/db/schema";
import { db } from "@/lib/db/drizzle";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
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

const OverrideSchema = z.object({
  userId: z.coerce.number().int().positive(),
  permissionId: z.coerce.number().int().positive(),
  granted: z.string().transform((v) => v === "true"),
  reason: z.string().max(500).optional(),
  /**
   * Riceviamo due campi separati:
   * - expiresAt: stringa datetime-local (es. "2026-04-09T08:10") — ora locale del browser
   * - tzOffset: offset in minuti da UTC (es. -180 per EEST UTC+3)
   *
   * Convertiamo in UTC sottraendo l'offset:
   *   utcMs = localMs + offsetMinutes * 60_000
   */
  expiresAt: z.string().optional(),
  tzOffset: z.coerce.number().default(0),
}).transform((data) => {
  let expiresAt: Date | undefined;
  if (data.expiresAt && data.expiresAt.trim() !== "") {
    // new Date("2026-04-09T08:10") è interpretato come UTC in Node — correggere con l'offset
    const localMs = new Date(data.expiresAt).getTime();
    // tzOffset è negativo per UTC+ (convenzione JS getTimezoneOffset)
    expiresAt = new Date(localMs + data.tzOffset * 60_000);
  }
  return { ...data, expiresAt };
});

export async function addOverride(formData: FormData) {
  const admin = await getUser();
  if (!admin || !admin.isAdmin) return { error: "Non autorizzato" };

  const parsed = OverrideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { userId, permissionId, granted, reason, expiresAt } = parsed.data;

  // Recupera la key del permesso per il log
  const [perm] = await db
    .select({ key: permissions.key })
    .from(permissions)
    .where(eq(permissions.id, permissionId))
    .limit(1);

  await addUserPermissionOverride({
    userId,
    permissionId,
    granted,
    grantedBy: admin.id,
    reason,
    expiresAt,
  });

  await logRbacAction(
    admin.id,
    granted ? ActivityType.PERMISSION_GRANTED : ActivityType.PERMISSION_REVOKED,
    `user_override userId=${userId} perm=${perm?.key ?? permissionId} granted=${granted}` +
      (expiresAt ? ` expires=${expiresAt.toISOString()}` : "") +
      (reason ? ` reason="${reason}"` : ""),
  );

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function removeOverride(overrideId: number, userId: number) {
  const admin = await getUser();
  if (!admin || !admin.isAdmin) return { error: "Non autorizzato" };

  await removeUserPermissionOverride(overrideId);

  await logRbacAction(
    admin.id,
    ActivityType.PERMISSION_REVOKED,
    `remove_override overrideId=${overrideId} userId=${userId}`,
  );

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

/**
 * Elimina tutti gli override scaduti dell'utente.
 * Chiamata sia manualmente dal pulsante UI sia automaticamente al caricamento della pagina.
 */
export async function purgeExpired(userId: number) {
  const admin = await getUser();
  if (!admin || !admin.isAdmin) return { error: "Non autorizzato" };

  const deleted = await purgeExpiredOverrides(userId);

  if (deleted > 0) {
    await logRbacAction(
      admin.id,
      ActivityType.PERMISSION_REVOKED,
      `purge_expired_overrides userId=${userId} deleted=${deleted}`,
    );
  }

  revalidatePath(`/admin/users/${userId}`);
  return { success: true, deleted };
}
