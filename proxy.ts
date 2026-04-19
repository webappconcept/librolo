// proxy.ts
import { signToken, verifyToken } from "@/lib/auth/session";
import { getRedirectByFromPath } from "@/lib/db/redirects-queries";
import {
  getActiveRoutes,
} from "@/lib/db/route-registry-queries";
import type { RouteVisibility } from "@/lib/db/schema";
import {
  ADMIN_ROUTES,
  ADMIN_SIGNIN_ROUTE,
  AUTH_ROUTES,
  PUBLIC_ROUTES,
} from "@/lib/routes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers per confronto pathname → array di prefissi
// ---------------------------------------------------------------------------
function matchesPrefix(pathname: string, routes: string[]): boolean {
  return routes.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

/**
 * Carica le route dal DB registry e le suddivide per visibilità.
 * Se il DB non risponde o è vuoto, usa le costanti statiche di fallback.
 */
async function resolveRoutes(): Promise<{
  publicRoutes: string[];
  authRoutes: string[];
  adminRoutes: string[];
  privateRoutes: string[];
}> {
  // Fallback statico garantito anche se il DB è irraggiungibile
  const fallback = {
    publicRoutes: PUBLIC_ROUTES,
    authRoutes: AUTH_ROUTES,
    adminRoutes: ADMIN_ROUTES,
    privateRoutes: [
      "/dashboard",
      "/profilo",
      "/account",
      "/libreria",
      "/esplora",
      "/assistenza",
      "/segnala",
    ],
  };

  try {
    const rows = await getActiveRoutes();
    if (!rows || rows.length === 0) return fallback;

    const byVisibility = (v: RouteVisibility) =>
      rows.filter((r) => r.visibility === v).map((r) => r.pathname);

    const publicRoutes  = byVisibility("public");
    const authRoutes    = byVisibility("auth-only");
    const adminRoutes   = byVisibility("admin");
    const privateRoutes = byVisibility("private");

    return {
      publicRoutes:  publicRoutes.length  > 0 ? publicRoutes  : fallback.publicRoutes,
      authRoutes:    authRoutes.length    > 0 ? authRoutes    : fallback.authRoutes,
      adminRoutes:   adminRoutes.length   > 0 ? adminRoutes   : fallback.adminRoutes,
      privateRoutes: privateRoutes.length > 0 ? privateRoutes : fallback.privateRoutes,
    };
  } catch {
    // DB non risponde → degradazione silenziosa con fallback statico
    return fallback;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // --- REDIRECT DA DB (301/302/307/308) ---
  // Eseguito prima di qualsiasi check auth, così i redirect funzionano
  // per tutti gli utenti indipendentemente dallo stato di login.
  // Skippiamo asset statici, API routes e route admin per evitare overhead inutile.
  const isStaticOrApi =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin/");

  if (!isStaticOrApi) {
    try {
      const redirect = await getRedirectByFromPath(pathname);
      if (redirect && redirect.isActive) {
        const destination = new URL(redirect.toPath, request.url);
        return NextResponse.redirect(destination, {
          status: redirect.statusCode,
        });
      }
    } catch {
      // Se il DB non risponde non blocchiamo la request — degradiamo silenziosamente
    }
  }

  // --- RISOLVI ROUTE DAL REGISTRY (con fallback statico) ---
  const { publicRoutes, authRoutes, adminRoutes, privateRoutes } =
    await resolveRoutes();

  const isPublicRoute  = matchesPrefix(pathname, publicRoutes);
  const isAuthRoute    = matchesPrefix(pathname, authRoutes);
  const isAdminRoute   = matchesPrefix(pathname, adminRoutes);
  const isAdminSignIn  = pathname === ADMIN_SIGNIN_ROUTE;
  const isPrivateRoute = matchesPrefix(pathname, privateRoutes);

  // --- ADMIN SIGN-IN: sempre accessibile ---
  // NON facciamo redirect verso /admin anche se la sessione è valida:
  // non possiamo sapere qui se l'utente ha davvero admin:access (no DB sull'edge).
  // Il redirect post-login è compito della server action di login.
  // Se reindirizzassimo qui creeremmo un loop quando requireAdminPage() nega l'accesso
  // e manda a /admin/sign-in, che ci rimanda a /admin, che rimanda a /admin/sign-in...
  if (isAdminSignIn) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const isLoggedIn = !!sessionCookie;

  // Utente loggato su /sign-in o /sign-up → home
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Utente non loggato su /sign-in o /sign-up → lascia passare
  if (isAuthRoute && !isLoggedIn) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- ROUTE ADMIN ---
  // Il proxy verifica SOLO che esista una sessione valida e non scaduta.
  // La verifica RBAC reale (isAdmin flag o permesso admin:access via ruolo)
  // avviene nel Server Component tramite requireAdminPage() in lib/rbac/guards.ts.
  if (isAdminRoute) {
    if (!isLoggedIn) {
      const url = new URL("/admin/sign-in", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    try {
      const parsed = await verifyToken(sessionCookie!.value);
      const notExpired = new Date(parsed.expires) > new Date();
      if (!notExpired) {
        const url = new URL("/admin/sign-in", request.url);
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
      }
      // Sessione valida → passa al Server Component che farà il check RBAC
    } catch {
      return NextResponse.redirect(new URL("/admin/sign-in", request.url));
    }
  }

  // --- ROUTE PRIVATE CONOSCIUTE: richiede login ---
  if (isPrivateRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // --- REFRESH SESSION ---
  let res = NextResponse.next({ request: { headers: requestHeaders } });

  if (sessionCookie && request.method === "GET") {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
      res.cookies.set({
        name: "session",
        value: await signToken({
          user: {
            id: parsed.user.id,
            role: parsed.user.role ?? "member",
          },
          expires: expiresInOneDay.toISOString(),
        }),
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: expiresInOneDay,
      });
    } catch {
      res.cookies.delete("session");
      if (isPrivateRoute || isAdminRoute) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
