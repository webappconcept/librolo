"use server";

import { deleteSeoPage, renameSeoPage, upsertSeoPage } from "@/lib/db/seo-queries";
import { JSON_LD_TYPES, type JsonLdType } from "./_components/jsonld-types";
import { revalidatePath } from "next/cache";
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
  jsonLdEnabled: z.boolean().default(false),
  jsonLdType: z.string().optional().nullable(),
});

export async function upsertSeoPageAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const jsonLdTypeRaw = formData.get("jsonLdType");
  const jsonLdTypeValue =
    typeof jsonLdTypeRaw === "string" && JSON_LD_TYPES.includes(jsonLdTypeRaw as JsonLdType)
      ? jsonLdTypeRaw
      : null;

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
    jsonLdEnabled: formData.get("jsonLdEnabled") === "true",
    jsonLdType: jsonLdTypeValue,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { originalPathname, ...data } = parsed.data;

  const finalData = {
    ...data,
    ogImage: data.ogImage === "" ? null : (data.ogImage ?? null),
    title: data.title ?? null,
    description: data.description ?? null,
    ogTitle: data.ogTitle ?? null,
    ogDescription: data.ogDescription ?? null,
  };

  try {
    if (originalPathname && originalPathname !== finalData.pathname) {
      await renameSeoPage(originalPathname, finalData);
      revalidatePath("/admin/seo");
      revalidatePath(originalPathname);
      revalidatePath(finalData.pathname);
    } else {
      await upsertSeoPage(finalData);
      revalidatePath("/admin/seo");
      revalidatePath(finalData.pathname);
    }
  } catch (err) {
    console.error("[upsertSeoPageAction] error:", err);
    return { error: "Errore nel salvataggio. Riprova." };
  }

  return { success: true };
}

export async function deleteSeoPageAction(
  pathname: string,
): Promise<{ error?: string; success?: boolean }> {
  if (!pathname) return { error: "Pathname mancante" };
  try {
    await deleteSeoPage(pathname);
    revalidatePath("/admin/seo");
    revalidatePath(pathname);
  } catch (err) {
    console.error("[deleteSeoPageAction] error:", err);
    return { error: "Errore nell'eliminazione. Riprova." };
  }
  return { success: true };
}
