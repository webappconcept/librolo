"use server";

import { deleteSeoPage, upsertSeoPage } from "@/lib/db/seo-queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  pathname: z
    .string()
    .min(1)
    .regex(/^\//, { message: "Il pathname deve iniziare con /" }),
  label: z.string().min(1, "Il nome è obbligatorio").max(100),
  title: z.string().max(70).optional(),
  description: z.string().max(160).optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
});

export async function upsertSeoPageAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const raw = {
    pathname: formData.get("pathname"),
    label: formData.get("label"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    ogTitle: formData.get("ogTitle") || undefined,
    ogDescription: formData.get("ogDescription") || undefined,
    ogImage: formData.get("ogImage") || undefined,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dati non validi" };
  }

  await upsertSeoPage(parsed.data);
  revalidatePath("/admin/seo");
  revalidatePath(parsed.data.pathname);
  return { success: true };
}

export async function deleteSeoPageAction(
  pathname: string,
): Promise<{ error?: string; success?: boolean }> {
  if (!pathname) return { error: "Pathname mancante" };
  await deleteSeoPage(pathname);
  revalidatePath("/admin/seo");
  revalidatePath(pathname);
  return { success: true };
}
