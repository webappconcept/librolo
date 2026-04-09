import { db } from "@/lib/db/drizzle";
import { appSettings } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(appSettings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  // Dominio dalle impostazioni generali, con fallback
  let domain = map["app_domain"]?.trim() ?? "";
  if (domain && !/^https?:\/\//i.test(domain)) domain = `https://${domain}`;
  domain = domain.replace(/\/$/, "") || "http://localhost:3000";

  const content =
    map["robots_txt"]?.trim() ||
    `User-agent: *\nAllow: /\n\n# Blocca l'area admin\nDisallow: /admin/\n\n# Sitemap\nSitemap: ${domain}/sitemap.xml`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
