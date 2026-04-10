"use server";

import { deletePage, upsertPage } from "@/lib/db/pages-queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  originalSlug: z.string().optional(),
  slug: z
    .string()
    .min(1, "Lo slug è obbligatorio")
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug non valido: usa solo lettere minuscole, numeri e trattini (es. chi-siamo)",
    }),
  title: z.string().min(1, "Il titolo è obbligatorio").max(255),
  content: z.string().default(""),
  status: z.enum(["draft", "published"]).default("draft"),
});

export async function upsertPageAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const raw = {
    originalSlug: formData.get("originalSlug") || undefined,
    slug: formData.get("slug"),
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    status: formData.get("status") ?? "draft",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { originalSlug, ...data } = parsed.data;

  const publishedAt =
    data.status === "published" ? new Date() : null;

  try {
    await upsertPage({ ...data, publishedAt });
    revalidatePath("/admin/contenuti");
    revalidatePath(`/${data.slug}`);
    // Se lo slug è cambiato, invalida anche il vecchio path
    if (originalSlug && originalSlug !== data.slug) {
      revalidatePath(`/${originalSlug}`);
      // Aggiorna anche meta-tags SEO (invalidazione lista)
      revalidatePath("/admin/seo/meta-tags");
    }
  } catch (err) {
    console.error("[upsertPageAction] error:", err);
    return { error: "Errore nel salvataggio. Riprova." };
  }

  return { success: true };
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
