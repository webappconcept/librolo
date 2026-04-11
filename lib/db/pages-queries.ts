import { db } from "@/lib/db/drizzle";
import { pages, pageTemplates, templateFields, type NewPage, type Page, type PageTemplate, type TemplateField } from "@/lib/db/schema";
import { asc, eq, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export async function getAllPages(): Promise<Page[]> {
  return db.select().from(pages).orderBy(asc(pages.sortOrder), asc(pages.slug));
}

/** Restituisce le pagine root (senza parent) con le loro figlie dirette */
export async function getPagesTree(): Promise<(Page & { children: Page[] })[]> {
  const all = await db.select().from(pages).orderBy(asc(pages.sortOrder), asc(pages.slug));
  const roots = all.filter((p) => !p.parentId);
  return roots.map((root) => ({
    ...root,
    children: all.filter((p) => p.parentId === root.id),
  }));
}

export async function getPublishedPages(): Promise<Pick<Page, "slug" | "title">[]> {
  return db
    .select({ slug: pages.slug, title: pages.title })
    .from(pages)
    .where(eq(pages.status, "published"))
    .orderBy(asc(pages.slug));
}

export async function getPageBySlug(slug: string): Promise<Page | undefined> {
  const [row] = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, slug))
    .limit(1);
  return row;
}

export async function getPageById(id: number): Promise<Page | undefined> {
  const [row] = await db
    .select()
    .from(pages)
    .where(eq(pages.id, id))
    .limit(1);
  return row;
}

/** Carica pagina con template e campi custom — usato dal frontend */
export async function getPageWithTemplate(
  slug: string,
): Promise<(Page & { template: (PageTemplate & { fields: TemplateField[] }) | null }) | undefined> {
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!page) return undefined;

  if (!page.templateId) return { ...page, template: null };

  const [template] = await db
    .select()
    .from(pageTemplates)
    .where(eq(pageTemplates.id, page.templateId))
    .limit(1);

  if (!template) return { ...page, template: null };

  const fields = await db
    .select()
    .from(templateFields)
    .where(eq(templateFields.templateId, template.id))
    .orderBy(asc(templateFields.sortOrder));

  return { ...page, template: { ...template, fields } };
}

/**
 * Crea o aggiorna una pagina.
 * - Se `data.id` è presente → UPDATE WHERE id (gestisce cambio slug senza duplicati).
 * - Se `data.id` è assente → INSERT ... ON CONFLICT (slug) DO UPDATE (crea nuova pagina).
 * Ritorna sempre l'id della riga.
 */
export async function upsertPage(data: NewPage & { id?: number }): Promise<number> {
  if (data.id) {
    const { id, ...rest } = data;
    await db
      .update(pages)
      .set({
        slug: rest.slug,
        title: rest.title,
        content: rest.content,
        status: rest.status,
        publishedAt: rest.publishedAt ?? null,
        expiresAt: rest.expiresAt ?? null,
        parentId: rest.parentId ?? null,
        templateId: rest.templateId ?? null,
        customFields: rest.customFields ?? "{}",
        pageType: rest.pageType ?? "page",
        sortOrder: rest.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, id));
    return id;
  } else {
    const [row] = await db
      .insert(pages)
      .values(data)
      .onConflictDoUpdate({
        target: pages.slug,
        set: {
          title: data.title,
          content: data.content,
          status: data.status,
          publishedAt: data.publishedAt ?? null,
          expiresAt: data.expiresAt ?? null,
          parentId: data.parentId ?? null,
          templateId: data.templateId ?? null,
          customFields: data.customFields ?? "{}",
          pageType: data.pageType ?? "page",
          sortOrder: data.sortOrder ?? 0,
          updatedAt: new Date(),
        },
      })
      .returning({ id: pages.id });
    return row.id;
  }
}

/**
 * Raccoglie ricorsivamente tutti gli id discendenti di una pagina (figli, nipoti, …).
 */
async function collectDescendantIds(rootId: number): Promise<number[]> {
  const all = await db.select({ id: pages.id, parentId: pages.parentId }).from(pages);
  const ids: number[] = [];
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    const children = all.filter((p) => p.parentId === current);
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }
  return ids;
}

/**
 * Elimina una pagina e TUTTI i suoi discendenti (cascade applicativo).
 * Ritorna il numero totale di righe eliminate (inclusa la pagina radice).
 */
export async function deletePageCascade(slug: string): Promise<number> {
  const [root] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!root) return 0;

  const descendantIds = await collectDescendantIds(root.id);
  const allIds = [...descendantIds, root.id];

  await db.delete(pages).where(inArray(pages.id, allIds));
  return allIds.length;
}

export async function deletePage(slug: string): Promise<void> {
  await db.delete(pages).where(eq(pages.slug, slug));
}

/**
 * Conta i discendenti diretti e totali di una pagina dato il suo id.
 */
export async function countDescendants(pageId: number): Promise<{ direct: number; total: number }> {
  const all = await db.select({ id: pages.id, parentId: pages.parentId }).from(pages);
  const direct = all.filter((p) => p.parentId === pageId).length;
  const ids: number[] = [];
  const queue = [pageId];
  while (queue.length) {
    const current = queue.shift()!;
    const children = all.filter((p) => p.parentId === current);
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }
  return { direct, total: ids.length };
}

/** Inverte lo status published <-> draft aggiornando publishedAt se necessario */
export async function togglePageStatus(id: number, currentStatus: string): Promise<void> {
  const newStatus = currentStatus === "published" ? "draft" : "published";
  const now = new Date();
  await db
    .update(pages)
    .set({
      status: newStatus as "draft" | "published",
      publishedAt: newStatus === "published" ? now : undefined,
      updatedAt: now,
    })
    .where(eq(pages.id, id));
}
