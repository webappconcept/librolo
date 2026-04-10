"use server";

import { deletePage, getPageBySlug, upsertPage } from "@/lib/db/pages-queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  originalSlug: z.string().optional(),
  slug: z
    .string()
    .min(1, "Lo slug è obbligatorio")
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug non valido: usa solo lettere minuscole, numeri e trattini",
    }),
  title: z.string().min(1, "Il titolo è obbligatorio").max(255),
  content: z.string().default(""),
  status: z.enum(["draft", "published"]).default("draft"),
  publishedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function upsertPageAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; savedAt?: string }> {
  const raw = {
    originalSlug: formData.get("originalSlug") || undefined,
    slug: formData.get("slug"),
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    status: formData.get("status") ?? "draft",
    publishedAt: formData.get("publishedAt") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { originalSlug, publishedAt, expiresAt, ...data } = parsed.data;

  // Logica publishedAt: se published e non specificata, usa ora
  let resolvedPublishedAt: Date | null = null;
  if (data.status === "published") {
    resolvedPublishedAt = publishedAt ? new Date(publishedAt) : new Date();
  } else if (publishedAt) {
    resolvedPublishedAt = new Date(publishedAt);
  }

  const resolvedExpiresAt = expiresAt ? new Date(expiresAt) : null;

  try {
    await upsertPage({
      ...data,
      publishedAt: resolvedPublishedAt,
      expiresAt: resolvedExpiresAt,
    });
    revalidatePath("/admin/contenuti");
    revalidatePath(`/${data.slug}`);
    if (originalSlug && originalSlug !== data.slug) {
      revalidatePath(`/${originalSlug}`);
      revalidatePath("/admin/seo/meta-tags");
    }
  } catch (err) {
    console.error("[upsertPageAction] error:", err);
    return { error: "Errore nel salvataggio. Riprova." };
  }

  // Ritorna success con timestamp — NON fa redirect
  return { success: true, savedAt: new Date().toISOString() };
}

export async function deletePageAction(
  slug: string,
): Promise<{ error?: string; success?: boolean }> {
  if (!slug) return { error: "Slug mancante" };
  try {
    await deletePage(slug);
    revalidatePath("/admin/contenuti");
    revalidatePath(`/${slug}`);
    revalidatePath("/admin/seo/meta-tags");
  } catch (err) {
    console.error("[deletePageAction] error:", err);
    return { error: "Errore nell'eliminazione. Riprova." };
  }
  return { success: true };
}

export async function getPageForEditAction(slug: string) {
  return getPageBySlug(slug);
}
