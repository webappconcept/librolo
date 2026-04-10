import { db } from "@/lib/db/drizzle";
import { pages, pageTemplates, templateFields, type NewPage, type Page, type PageTemplate, type TemplateField } from "@/lib/db/schema";
import { asc, eq, isNull } from "drizzle-orm";

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

export async function upsertPage(data: NewPage): Promise<void> {
  await db
    .insert(pages)
    .values(data)
    .onConflictDoUpdate({
      target: pages.slug,
      set: {
        title: data.title,
        content: data.content,
        status: data.status,
        publishedAt: data.publishedAt,
        expiresAt: data.expiresAt ?? null,
        parentId: data.parentId ?? null,
        templateId: data.templateId ?? null,
        customFields: data.customFields ?? "{}",
        pageType: data.pageType ?? "page",
        sortOrder: data.sortOrder ?? 0,
        updatedAt: new Date(),
      },
    });
}

export async function deletePage(slug: string): Promise<void> {
  await db.delete(pages).where(eq(pages.slug, slug));
}
