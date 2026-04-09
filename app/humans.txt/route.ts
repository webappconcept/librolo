import { db } from "@/lib/db/drizzle";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "humans_txt"))
    .then((r) => r[0]);

  const content = row?.value?.trim() || `/* TEAM */\nBuilt with \u2665 by the team.`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
