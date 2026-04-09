// app/(admin)/admin/users/[id]/actions.ts
"use server";

import {
  addUserPermissionOverride,
  removeUserPermissionOverride,
  purgeExpiredOverrides,
} from "@/lib/rbac/permissions-queries";
import { db } from "@/lib/db/drizzle";
import { permissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const OverrideSchema = z.object({
  userId: z.coerce.number().int().positive(),
  permissionId: z.coerce.number().int().positive(),
  granted: z.string().transform((v) => v === "true"),
  reason: z.string().max(500).optional(),
  expiresAt: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? new Date(v) : undefined)),
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
