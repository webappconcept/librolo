"use server";

import { deleteSeoPage, renameSeoPage, upsertSeoPage } from "@/lib/db/seo-queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ROBOTS_VALUES = ["", "noindex,nofollow", "noindex,follow"] as const;

/**
 * Tipi JSON-LD supportati.
 * Aggiungere qui nuovi tipi se necessario — la select nel form si aggiorna automaticamente.
 */
export const JSON_LD_TYPES = [
  "WebPage",
  "Article",
  "BlogPosting",
  "Product",
  "FAQPage",
  "BreadcrumbList",
  "Organization",
  "LocalBusiness",
  "Person",
  "Event",
  "VideoObject",
] as const;

export type JsonLdType = (typeof JSON_LD_TYPES)[number];

const schema = z.object({
  pathname: z
    .string()
    .min(1)
    .regex(/^\//, { message: "Il pathname deve iniziare con /" }),
  originalPathname: z.string().optional(),
  label: z.string().min(1, "Il nome è obbligatorio").max(100),
  title: z.string().max(70).optional().or(z.literal("")).transform(v => v || null),
  description: z.string().max(160).optional().or(z.literal("")).transform(v => v || null),
  ogTitle: z.string().max(70).optional().or(z.literal("")).transform(v => v || null),
  ogDescription: z.string().max(200).optional().or(z.literal("")).transform(v => v || null),
  ogImage: z.string().url().optional().or(z.literal("")).transform(v => v || null),
  robots: z
    .enum(ROBOTS_VALUES)
    .optional()
    .transform((v) => v || null),
  jsonLdEnabled: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  jsonLdType: z
    .string()
    .optional()
    .transform((v) =>
      v && JSON_LD_TYPES.includes(v as JsonLdType) ? (v as JsonLdType) : null
    ),
});

export async function upsertSeoPageAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const raw = {
    pathname: formData.get("pathname"),
    originalPathname: formData.get("originalPathname") || undefined,
    label: formData.get("label"),
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    ogTitle: formData.get("ogTitle") ?? "",
    ogDescription: formData.get("ogDescription") ?? "",
    ogImage: formData.get("ogImage") ?? "",
    robots: formData.get("robots") ?? "",
    jsonLdEnabled: formData.get("jsonLdEnabled") ?? "false",
    jsonLdType: formData.get("jsonLdType") ?? "",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { originalPathname, ...data } = parsed.data;

  if (originalPathname && originalPathname !== data.pathname) {
    await renameSeoPage(originalPathname, data);
    revalidatePath("/admin/seo");
    revalidatePath(originalPathname);
    revalidatePath(data.pathname);
  } else {
    await upsertSeoPage(data);
    revalidatePath("/admin/seo");
    revalidatePath(data.pathname);
  }

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
