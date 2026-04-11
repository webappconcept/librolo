"use server";

import { deletePage, getPageBySlug, upsertPage } from "@/lib/db/pages-queries";
import { upsertRedirect } from "@/lib/db/redirects-queries";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  originalSlug: z.string().optional(),
  slug: z
    .string()
    .min(1, "Lo slug è obbligatorio")
    .max(255)
    .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/, {
      message: "Slug non valido: usa solo lettere minuscole, numeri, trattini e slash",
    }),
  title: z.string().min(1, "Il titolo è obbligatorio").max(255),
  content: z.string().default(""),
  status: z.enum(["draft", "published"]).default("draft"),
  publishedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  parentId: z.string().optional(),
  templateId: z.string().optional(),
  customFields: z.string().optional(),
  pageType: z.string().optional(),
  sortOrder: z.string().optional(),
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
    parentId: formData.get("parentId") || undefined,
    templateId: formData.get("templateId") || undefined,
    customFields: formData.get("customFields") || undefined,
    pageType: formData.get("pageType") || undefined,
    sortOrder: formData.get("sortOrder") || undefined,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { originalSlug, publishedAt, expiresAt, parentId, templateId, customFields, pageType, sortOrder, ...data } = parsed.data;

  let resolvedPublishedAt: Date | null = null;
  if (data.status === "published") {
    resolvedPublishedAt = publishedAt ? new Date(publishedAt) : new Date();
  } else if (publishedAt) {
    resolvedPublishedAt = new Date(publishedAt);
  }

  const resolvedExpiresAt = expiresAt ? new Date(expiresAt) : null;

  let parsedCustomFields: Record<string, unknown> = {};
  if (customFields) {
    try { parsedCustomFields = JSON.parse(customFields); } catch { /* noop */ }
  }

  const slugChanged = originalSlug && originalSlug !== data.slug;

  try {
    await upsertPage({
      ...data,
      publishedAt: resolvedPublishedAt,
      expiresAt: resolvedExpiresAt,
      parentId: parentId ? Number(parentId) : null,
      templateId: templateId ? Number(templateId) : null,
      customFields: JSON.stringify(parsedCustomFields),
      pageType: pageType ?? "page",
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    });

    // Auto-redirect 301: vecchio slug → nuovo slug
    if (slugChanged) {
      await upsertRedirect({
        fromPath: `/${originalSlug}`,
        toPath: `/${data.slug}`,
        statusCode: 301,
      });
    }

    revalidatePath("/admin/contenuti");
    revalidatePath(`/${data.slug}`);
    if (slugChanged) {
      revalidatePath(`/${originalSlug}`);
      revalidatePath("/admin/seo/meta-tags");
      revalidatePath("/admin/redirect");
    }
  } catch (err) {
    console.error("[upsertPageAction] error:", err);
    return { error: "Errore nel salvataggio. Riprova." };
  }

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
