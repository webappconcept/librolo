// lib/auth/oauth/google.ts
//
// Flow Google OAuth 2.0 + PKCE (senza dipendenze esterne).
//
// Flow:
//   1. buildGoogleAuthUrl()  → genera state + code_verifier, li salva in cookie,
//                              ritorna l'URL di redirect verso Google
//   2. handleGoogleCallback() → verifica state, scambia code → tokens,
//                               chiama userinfo, ritorna GoogleUser

import { cookies } from "next/headers";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_URL  = "https://www.googleapis.com/oauth2/v3/userinfo";
const SCOPES = "openid email profile";

function getConfig() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "[google-oauth] Missing env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function generateCodeVerifier(): string {
  return crypto.randomBytes(48).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ---------------------------------------------------------------------------
// Step 1 — costruisce URL di redirect verso Google
// ---------------------------------------------------------------------------

export async function buildGoogleAuthUrl(): Promise<string> {
  const { clientId, redirectUri } = getConfig();

  const state        = crypto.randomBytes(24).toString("base64url");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Salva state e code_verifier in cookie httpOnly (5 minuti)
  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/",
    maxAge:   300, // 5 minuti
  };
  jar.set("oauth_state",         state,        cookieOpts);
  jar.set("oauth_code_verifier", codeVerifier, cookieOpts);

  const params = new URLSearchParams({
    client_id:             clientId,
    redirect_uri:          redirectUri,
    response_type:         "code",
    scope:                 SCOPES,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: "S256",
    access_type:           "offline", // per ottenere refresh_token
    prompt:                "select_account",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Step 2 — scambia code → tokens, verifica state, ritorna utente Google
// ---------------------------------------------------------------------------

export interface GoogleUser {
  sub:            string; // Google ID univoco
  email:          string;
  email_verified: boolean;
  name:           string;
  given_name:     string | null;
  family_name:    string | null;
  picture:        string | null;
}

export interface GoogleTokens {
  access_token:  string;
  refresh_token: string | null;
  expires_at:    Date | null;
  scope:         string;
}

export async function handleGoogleCallback(
  code: string,
  stateParam: string,
): Promise<{ user: GoogleUser; tokens: GoogleTokens }> {
  const { clientId, clientSecret, redirectUri } = getConfig();

  // Leggi e valida state + code_verifier dai cookie
  const jar          = await cookies();
  const savedState   = jar.get("oauth_state")?.value;
  const codeVerifier = jar.get("oauth_code_verifier")?.value;

  // Cancella i cookie one-time immediatamente
  jar.delete("oauth_state");
  jar.delete("oauth_code_verifier");

  if (!savedState || savedState !== stateParam) {
    throw new Error("[google-oauth] State mismatch — possibile CSRF");
  }
  if (!codeVerifier) {
    throw new Error("[google-oauth] Missing code_verifier cookie");
  }

  // Scambia authorization code → access_token + refresh_token
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`[google-oauth] Token exchange failed: ${err}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token:  string;
    refresh_token?: string;
    expires_in?:   number;
    scope:         string;
    token_type:    string;
  };

  const tokens: GoogleTokens = {
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    expires_at:    tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null,
    scope: tokenData.scope,
  };

  // Chiama userinfo per ottenere i dati dell'utente
  const userRes = await fetch(GOOGLE_USER_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error("[google-oauth] Failed to fetch Google userinfo");
  }

  const googleUser = (await userRes.json()) as GoogleUser;

  if (!googleUser.email_verified) {
    throw new Error("[google-oauth] Email non verificata da Google");
  }

  return { user: googleUser, tokens };
}
