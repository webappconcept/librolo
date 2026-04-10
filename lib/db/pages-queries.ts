import { db } from "@/lib/db/drizzle";
import { pages, type NewPage, type Page } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export async function getAllPages(): Promise<Page[]> {
  return db.select().from(pages).orderBy(asc(pages.slug));
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
        updatedAt: new Date(),
      },
    });
}

export async function deletePage(slug: string): Promise<void> {
  await db.delete(pages).where(eq(pages.slug, slug));
}
