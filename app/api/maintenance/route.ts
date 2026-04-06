// app/api/maintenance/route.ts
import { getAppSettings } from "@/lib/db/settings-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json({
    enabled: settings.maintenance_mode === "true",
  });
}
