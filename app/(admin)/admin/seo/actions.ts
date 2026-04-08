"use server";

import { deleteSeoPage, renameSeoPage, upsertSeoPage } from "@/lib/db/seo-queries";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

const ROBOTS_VALUES = ["", "noindex,nofollow", "noindex,follow"] as const;

const schema = z.object({
  pathname: z
    .string()
    .min(1)
    .regex(/^\//, { message: "Il pathname deve iniziare con /" }),
  originalPathname: z.string().optional(),
  label: z.string().min(1, "Il nome è obbligatorio").max(100),
  title: z.string().max(70).optional(),
  description: z.string().max(160).optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
  robots: z
    .enum(ROBOTS_VALUES)
    .optional()
    .transform((v) => v || null),
});

function invalidateSeoCache(pathnames: string[]) {
  revalidateTag("seo", "unstable_cache");
  revalidatePath("/admin/seo");
  for (const p of pathnames) {
    revalidatePath(p);
  }
}

export async function upsertSeoPageAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const raw = {
    pathname: formData.get("pathname"),
    originalPathname: formData.get("originalPathname") || undefined,
    label: formData.get("label"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    ogTitle: formData.get("ogTitle") || undefined,
    ogDescription: formData.get("ogDescription") || undefined,
    ogImage: formData.get("ogImage") || undefined,
    robots: formData.get("robots") || "",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { originalPathname, ...data } = parsed.data;

  if (originalPathname && originalPathname !== data.pathname) {
    await renameSeoPage(originalPathname, data);
    invalidateSeoCache([originalPathname, data.pathname]);
  } else {
    await upsertSeoPage(data);
    invalidateSeoCache([data.pathname]);
  }

  return { success: true };
}

export async function deleteSeoPageAction(
  pathname: string,
): Promise<{ error?: string; success?: boolean }> {
  if (!pathname) return { error: "Pathname mancante" };
  await deleteSeoPage(pathname);
  invalidateSeoCache([pathname]);
  return { success: true };
}
