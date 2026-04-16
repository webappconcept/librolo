/**
 * app/robots.txt/route.ts
 * Genera robots.txt dinamicamente via Next.js Route Handler.
 * Aggiornare NEXT_PUBLIC_SITE_URL nelle variabili d'ambiente.
 */
import { NextResponse } from "next/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://librolo.it";

export function GET() {
  const content = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/",
    "Disallow: /dashboard/",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n");

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
