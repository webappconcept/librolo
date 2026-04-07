import { db } from "@/lib/db/drizzle";
import { seoPages, type NewSeoPage, type SeoPage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getSeoPage(
  pathname: string,
): Promise<SeoPage | undefined> {
  const [row] = await db
    .select()
    .from(seoPages)
    .where(eq(seoPages.pathname, pathname))
    .limit(1);
  return row;
}

export async function getAllSeoPages(): Promise<SeoPage[]> {
  return db.select().from(seoPages).orderBy(seoPages.pathname);
}

export async function upsertSeoPage(data: NewSeoPage): Promise<void> {
  await db
    .insert(seoPages)
    .values(data)
    .onConflictDoUpdate({
      target: seoPages.pathname,
      set: {
        label: data.label,
        title: data.title,
        description: data.description,
        ogTitle: data.ogTitle,
        ogDescription: data.ogDescription,
        ogImage: data.ogImage,
        updatedAt: new Date(),
      },
    });
}

export async function deleteSeoPage(pathname: string): Promise<void> {
  await db.delete(seoPages).where(eq(seoPages.pathname, pathname));
}
