// app/(admin)/admin/users/[id]/actions.ts
"use server";

import {
  addUserPermissionOverride,
  removeUserPermissionOverride,
  purgeExpiredOverrides,
} from "@/lib/rbac/permissions-queries";
import { getUser } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

  await addUserPermissionOverride({
    userId,
    permissionId,
    granted,
    grantedBy: admin.id,
    reason,
    expiresAt,
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function removeOverride(overrideId: number, userId: number) {
  const admin = await getUser();
  if (!admin || !admin.isAdmin) return { error: "Non autorizzato" };

  await removeUserPermissionOverride(overrideId);
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
  revalidatePath(`/admin/users/${userId}`);
  return { success: true, deleted };
}
