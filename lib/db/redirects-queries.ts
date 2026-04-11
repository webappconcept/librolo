import { db } from "@/lib/db/drizzle";
import { redirects, type Redirect, type NewRedirect } from "@/lib/db/schema";
import { asc, desc, eq } from "drizzle-orm";

/** Tutti i redirect, dal più recente */
export async function getAllRedirects(): Promise<Redirect[]> {
  return db.select().from(redirects).orderBy(desc(redirects.createdAt));
}

/** Solo i redirect attivi — usato dal middleware */
export async function getActiveRedirects(): Promise<Pick<Redirect, "fromPath" | "toPath" | "statusCode">[]> {
  return db
    .select({ fromPath: redirects.fromPath, toPath: redirects.toPath, statusCode: redirects.statusCode })
    .from(redirects)
    .where(eq(redirects.isActive, true));
}

/** Cerca redirect per fromPath — usato dal middleware per lookup singolo */
export async function getRedirectByFromPath(
  fromPath: string,
): Promise<Pick<Redirect, "toPath" | "statusCode"> | undefined> {
  const [row] = await db
    .select({ toPath: redirects.toPath, statusCode: redirects.statusCode })
    .from(redirects)
    .where(eq(redirects.fromPath, fromPath))
    .limit(1);
  return row;
}

/**
 * Crea o aggiorna un redirect (upsert su fromPath).
 * Usato sia dall'action manuale che dall'auto-redirect al cambio slug.
 */
export async function upsertRedirect(
  data: Pick<NewRedirect, "fromPath" | "toPath" | "statusCode">,
): Promise<void> {
  await db
    .insert(redirects)
    .values({ ...data, isActive: true })
    .onConflictDoUpdate({
      target: redirects.fromPath,
      set: {
        toPath: data.toPath,
        statusCode: data.statusCode ?? 301,
        isActive: true,
        updatedAt: new Date(),
      },
    });
}

export async function toggleRedirectActive(id: number, isActive: boolean): Promise<void> {
  await db
    .update(redirects)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(redirects.id, id));
}

export async function deleteRedirect(id: number): Promise<void> {
  await db.delete(redirects).where(eq(redirects.id, id));
}
