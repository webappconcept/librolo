// app/api/maintenance/route.ts
import { getAppSettings } from "@/lib/db/settings-queries";
import { NextResponse } from "next/server";

export const revalidate = 60; // Next.js cache — 1 query ogni 60s

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json({
    enabled: settings.maintenance_mode === "true",
  });
}
