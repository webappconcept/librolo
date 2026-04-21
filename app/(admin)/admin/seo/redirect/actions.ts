"use server";

import { deleteRedirect, upsertRedirect } from "@/lib/db/redirects-queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.string().optional(),
  fromPath: z
    .string()
    .min(1, "Il path sorgente è obbligatorio")
    .regex(/^\//, { message: "Il path deve iniziare con /" }),
  toPath: z
    .string()
    .min(1, "Il path destinazione è obbligatorio")
    .regex(/^\//, { message: "Il path deve iniziare con /" }),
  statusCode: z.enum(["301", "302", "307", "308"]).default("301"),
  isActive: z.string().optional(),
});

export async function upsertRedirectAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; savedAt?: string }> {
  const raw = {
    id: formData.get("id") || undefined,
    fromPath: formData.get("fromPath"),
    toPath: formData.get("toPath"),
    statusCode: formData.get("statusCode") ?? "301",
    isActive: formData.get("isActive") || undefined,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const { id, statusCode, isActive, ...rest } = parsed.data;

  try {
    await upsertRedirect({
      id: id ? Number(id) : undefined,
      ...rest,
      statusCode: Number(statusCode) as 301 | 302 | 307 | 308,
      isActive: isActive === "true",
    });
    revalidatePath("/admin/redirect");
  } catch (err) {
    console.error("[upsertRedirectAction]", err);
    return { error: "Errore nel salvataggio." };
  }
  return { success: true, savedAt: new Date().toISOString() };
}

export async function deleteRedirectAction(
  id: number,
): Promise<{ error?: string; success?: boolean }> {
  try {
    await deleteRedirect(id);
    revalidatePath("/admin/redirect");
  } catch (err) {
    console.error("[deleteRedirectAction]", err);
    return { error: "Errore nell'eliminazione." };
  }
  return { success: true };
}
