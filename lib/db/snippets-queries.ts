// lib/db/snippets-queries.ts
import { db } from "@/lib/db/drizzle";
import { siteSnippets } from "@/lib/db/schema";
import type { SiteSnippet, SnippetPosition } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

/** Tutti gli snippet attivi, ordinati per sortOrder. Cache 1h, tag 'snippets'. */
export const getActiveSnippets = unstable_cache(
  async (): Promise<SiteSnippet[]> => {
    return db
      .select()
      .from(siteSnippets)
      .where(eq(siteSnippets.isActive, true))
      .orderBy(asc(siteSnippets.sortOrder));
  },
  ["active-snippets"],
  { revalidate: 3600, tags: ["snippets"] },
);

/** Tutti gli snippet (admin) senza cache. */
export async function getAllSnippets(): Promise<SiteSnippet[]> {
  return db
    .select()
    .from(siteSnippets)
    .orderBy(asc(siteSnippets.sortOrder));
}

/** Snippet attivi filtrati per posizione. */
export async function getActiveSnippetsByPosition(
  position: SnippetPosition,
): Promise<SiteSnippet[]> {
  const all = await getActiveSnippets();
  return all.filter((s) => s.position === position);
}
