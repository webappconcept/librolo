// app/api/auth/callback/google/route.ts
// GET /api/auth/callback/google?code=...&state=...
//
// 1. Verifica state + PKCE (dentro handleGoogleCallback)
// 2. Chiama findOrCreateOAuthUser → trova/crea utente nel DB
// 3. Controlla blacklist IP (stessa logica del login password)
// 4. Crea sessione custom → redirect a / (o /admin per gli admin)

import { isIpBlacklisted } from "@/lib/auth/blacklist";
import { handleGoogleCallback } from "@/lib/auth/oauth/google";
import { findOrCreateOAuthUser } from "@/lib/auth/oauth/index";
import { createSession } from "@/lib/auth/session";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, APP_URL));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Google ha rifiutato (es. utente ha premuto Annulla)
  if (error) {
    return redirect("/sign-in?error=oauth_denied");
  }

  if (!code || !state) {
    return redirect("/sign-in?error=oauth_invalid");
  }

  // Controlla blacklist IP prima di qualsiasi operazione
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  if (await isIpBlacklisted(ip)) {
    return redirect("/sign-in?error=blocked");
  }

  try {
    const { user: googleUser, tokens } = await handleGoogleCallback(code, state);

    const dbUser = await findOrCreateOAuthUser({
      provider:          "google",
      providerAccountId: googleUser.sub,
      email:             googleUser.email,
      emailVerified:     googleUser.email_verified,
      firstName:         googleUser.given_name ?? null,
      lastName:          googleUser.family_name ?? null,
      picture:           googleUser.picture ?? null,
      tokens,
    });

    if (!dbUser) {
      return redirect("/sign-in?error=oauth_user_failed");
    }

    // Utente bannato
    if (dbUser.bannedAt) {
      return redirect("/sign-in?error=banned");
    }

    // Crea la sessione custom (stesso meccanismo del login password)
    await createSession(dbUser.id, dbUser.role);

    // Coerente con signIn: admin → /admin, tutti gli altri → home
    return redirect(dbUser.role === "admin" ? "/admin" : "/");
  } catch (err) {
    console.error("[auth/callback/google] error:", err);
    return redirect("/sign-in?error=oauth_failed");
  }
}
