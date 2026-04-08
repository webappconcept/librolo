/**
 * Next.js Edge Middleware
 *
 * Protezione a livello edge: verifica solo che il cookie di sessione
 * esista e non sia scaduto. NON fa query al DB (non disponibile sull'edge).
 *
 * La verifica RBAC reale avviene nel Server Component tramite
 * requireAdminPage() in lib/rbac/guards.ts.
 *
 * Rotte protette:
 *  - /admin/*           → richiede sessione valida → redirect /admin/sign-in
 *  - /admin/sign-in     → se già loggato → redirect /admin
 *  - /dashboard/*       → richiede sessione valida → redirect /sign-in
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const key = new TextEncoder().encode(process.env.AUTH_SECRET);

async function getSessionFromCookie(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const data = payload as { user?: { id: number; role: string }; expires?: string };
    // Controlla scadenza
    if (!data.expires || new Date(data.expires) < new Date()) return null;
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Area Admin ---
  if (pathname.startsWith("/admin")) {
    const user = await getSessionFromCookie(req);

    // Se è la pagina di sign-in admin e l'utente è già autenticato
    if (pathname === "/admin/sign-in") {
      if (user) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Tutte le altre rotte /admin/* richiedono sessione valida
    // La verifica RBAC reale (isAdmin / admin:access) avviene nel Server Component
    if (!user) {
      const signInUrl = new URL("/admin/sign-in", req.url);
      signInUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  }

  // --- Area Dashboard / App autenticata ---
  if (pathname.startsWith("/dashboard")) {
    const user = await getSessionFromCookie(req);
    if (!user) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
  ],
};
