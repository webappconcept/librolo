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

function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function upsertSeoPageAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  // Legge tutti i valori raw dal FormData
  const pathnameRaw = formData.get("pathname");
  const originalPathnameRaw = formData.get("originalPathname");
  const labelRaw = formData.get("label");
  const titleRaw = formData.get("title");
  const descriptionRaw = formData.get("description");
  const ogTitleRaw = formData.get("ogTitle");
  const ogDescriptionRaw = formData.get("ogDescription");
  const ogImageRaw = formData.get("ogImage");
  const robotsRaw = formData.get("robots");
  const jsonLdEnabledRaw = formData.get("jsonLdEnabled");
  const jsonLdTypeRaw = formData.get("jsonLdType");

  // Validazioni manuali essenziali
  const pathname = typeof pathnameRaw === "string" ? pathnameRaw.trim() : "";
  if (!pathname) return { error: "Il pathname è obbligatorio" };
  if (!pathname.startsWith("/")) return { error: "Il pathname deve iniziare con /" };

  const label = typeof labelRaw === "string" ? labelRaw.trim() : "";
  if (!label) return { error: "Il nome è obbligatorio" };
  if (label.length > 100) return { error: "Il nome è troppo lungo (max 100 caratteri)" };

  const title = emptyToNull(titleRaw);
  const description = emptyToNull(descriptionRaw);
  const ogTitle = emptyToNull(ogTitleRaw);
  const ogDescription = emptyToNull(ogDescriptionRaw);
  const ogImageStr = emptyToNull(ogImageRaw);
  const robots = emptyToNull(robotsRaw);

  // Valida ogImage come URL solo se presente
  if (ogImageStr) {
    const urlSchema = z.url();
    const urlResult = urlSchema.safeParse(ogImageStr);
    if (!urlResult.success) return { error: "OG Image deve essere un URL valido" };
  }

  // JSON-LD
  const jsonLdEnabled = jsonLdEnabledRaw === "true";
  const jsonLdTypeStr = typeof jsonLdTypeRaw === "string" ? jsonLdTypeRaw.trim() : "";
  const jsonLdType = JSON_LD_TYPES.includes(jsonLdTypeStr as JsonLdType)
    ? (jsonLdTypeStr as JsonLdType)
    : null;

  const originalPathname =
    typeof originalPathnameRaw === "string" && originalPathnameRaw.trim()
      ? originalPathnameRaw.trim()
      : undefined;

  const data = {
    pathname,
    label,
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage: ogImageStr,
    robots,
    jsonLdEnabled,
    jsonLdType,
  };

  try {
    if (originalPathname && originalPathname !== pathname) {
      await renameSeoPage(originalPathname, data);
      revalidatePath("/admin/seo");
      revalidatePath(originalPathname);
      revalidatePath(pathname);
    } else {
      await upsertSeoPage(data);
      revalidatePath("/admin/seo");
      revalidatePath(pathname);
    }
  } catch (err) {
    console.error("[upsertSeoPageAction] DB error:", err);
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
    console.error("[deleteSeoPageAction] DB error:", err);
    return { error: "Errore nell'eliminazione. Riprova." };
  }
  return { success: true };
}
