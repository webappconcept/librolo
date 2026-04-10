import type { Page } from "@/lib/db/schema";

/** Stato effettivo di una pagina tenendo conto di expiresAt */
export type EffectiveStatus = "draft" | "published" | "expired" | "scheduled";

export function getEffectiveStatus(page: Pick<Page, "status" | "publishedAt" | "expiresAt">): EffectiveStatus {
  const now = new Date();

  if (page.status === "published") {
    // Scaduta: era pubblicata ma expiresAt è nel passato
    if (page.expiresAt && new Date(page.expiresAt) <= now) return "expired";
    // Programmata: publishedAt è nel futuro
    if (page.publishedAt && new Date(page.publishedAt) > now) return "scheduled";
    return "published";
  }

  return "draft";
}

export const STATUS_META: Record<
  EffectiveStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  published:  { label: "Pubblicata",  color: "#22c55e", bg: "color-mix(in srgb, #22c55e 12%, transparent)",  border: "color-mix(in srgb, #22c55e 30%, transparent)" },
  draft:      { label: "Bozza",       color: "#94a3b8", bg: "color-mix(in srgb, #94a3b8 12%, transparent)",  border: "color-mix(in srgb, #94a3b8 30%, transparent)" },
  expired:    { label: "Scaduta",     color: "#f59e0b", bg: "color-mix(in srgb, #f59e0b 12%, transparent)",  border: "color-mix(in srgb, #f59e0b 30%, transparent)" },
  scheduled:  { label: "Programmata", color: "#6366f1", bg: "color-mix(in srgb, #6366f1 12%, transparent)",  border: "color-mix(in srgb, #6366f1 30%, transparent)" },
};
