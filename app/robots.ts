import { db } from "@/lib/db/drizzle";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Se esiste un robots_txt personalizzato nel DB, servilo come testo grezzo
  // tramite la route /robots.txt gestita da Next.js.
  // Per contenuto completamente personalizzato, usiamo la route handler in app/robots.txt/route.ts
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "robots_txt"))
    .then((r) => r[0]);

  if (row?.value) {
    // Next.js Metadata robots() non supporta testo grezzo,
    // quindi facciamo il parse basilare solo per restituire regole valide.
    // Il testo grezzo viene servito dalla route handler /robots.txt/route.ts
    return {
      rules: { userAgent: "*", allow: "/" },
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/"] },
    ],
  };
}
