// app/api/auth/google/route.ts
// GET /api/auth/google  → redirect verso Google

import { buildGoogleAuthUrl } from "@/lib/auth/oauth/google";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = await buildGoogleAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[auth/google] build url error:", err);
    return NextResponse.redirect(
      new URL("/sign-in?error=oauth_init_failed", process.env.NEXT_PUBLIC_APP_URL ?? "/"),
    );
  }
}
