import { getAppSettings } from "@/lib/db/settings-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(settings);
}
