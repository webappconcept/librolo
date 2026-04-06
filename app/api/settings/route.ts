import { getAppSettings } from "@/lib/db/settings-queries";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Solo chiamate interne
  if (request.headers.get("x-internal-proxy") !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getAppSettings();
  return NextResponse.json(settings);
}
