import { db } from "./index";
import { redirects } from "./schema";
import { eq } from "drizzle-orm";

export async function getRedirects() {
  return db.select().from(redirects).orderBy(redirects.createdAt);
}

export async function getRedirectByFromPath(fromPath: string) {
  const rows = await db
    .select()
    .from(redirects)
    .where(eq(redirects.fromPath, fromPath))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertRedirect(data: {
  id?: number;
  fromPath: string;
  toPath: string;
  statusCode?: 301 | 302 | 307 | 308;
  isActive?: boolean;
}) {
  const { id, ...rest } = data;
  const payload = {
    fromPath: rest.fromPath,
    toPath: rest.toPath,
    statusCode: rest.statusCode ?? 301,
    isActive: rest.isActive ?? true,
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(redirects).set(payload).where(eq(redirects.id, id));
  } else {
    await db
      .insert(redirects)
      .values(payload)
      .onConflictDoUpdate({
        target: redirects.fromPath,
        set: payload,
      });
  }
}

export async function deleteRedirect(id: number) {
  await db.delete(redirects).where(eq(redirects.id, id));
}
