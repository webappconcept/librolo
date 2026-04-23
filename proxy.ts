// proxy.ts
import { signToken, verifyToken } from "@/lib/auth/session";
import { getRedirectByFromPath } from "@/lib/db/redirects-queries";
import { getActiveRoutes } from "@/lib/db/route-registry-queries";
import type { RouteVisibility } from "@/lib/db/schema";
import {
  ADMIN_SIGNIN_ROUTE,
  SYSTEM_ALWAYS_PUBLIC,
  SYSTEM_AUTH_ROUTES,
} from "@/lib/routes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesPrefix(pathname: string, routes: readonly string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

/**
 * Carica le route dal DB e le suddivide per visibilità.
 * NON ha più un fallback a liste statiche: le route di sistema
 * sono gestite dal kernel hardcoded sopra, il resto viene dal DB.
 * Se il DB non risponde, le route non-system degradano silenziosamente
 * (utente non autenticato non accede a route private).
 */
async function resolveRoutes(): Promise<{
  publicRoutes: string[];
  privateRoutes: string[];
}> {
  const empty = {
    publicRoutes: [],
    privateRoutes: [],
  };

  try {
    const rows = await getActiveRoutes();
    if (!rows || rows.length === 0) return empty;

    const byVisibility = (v: RouteVisibility) =>
      rows.filter((r) => r.visibility === v).map((r) => r.pathname);

    return {
      publicRoutes: byVisibility("public"),
      privateRoutes: byVisibility("private"),
    };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Proxy principale
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // --- [1] KERNEL: SYSTEM_ALWAYS_PUBLIC ---
  // /verify-email, /forgot-password, /reset-password
  // Bypass totale DB — queste route devono funzionare sempre.
  if (matchesPrefix(pathname, SYSTEM_ALWAYS_PUBLIC)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- [2] KERNEL: ADMIN SIGN-IN ---
  // Sempre accessibile, nessun redirect automatico post-login qui
  // per evitare loop con requireAdminPage().
  if (pathname === ADMIN_SIGNIN_ROUTE) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- [3] KERNEL: SYSTEM_AUTH_ROUTES (/sign-in, /sign-up) ---
  // Gestite con logica hardcoded: accessibili solo a utenti non loggati.
  // Non dipendono dal DB per funzionare correttamente.
  if (matchesPrefix(pathname, SYSTEM_AUTH_ROUTES)) {
    const isLoggedIn = !!sessionCookie;
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- [4] REDIRECT DA DB (301/302/307/308) ---
  // Prima di qualsiasi check auth, così i redirect funzionano per tutti.
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
      // DB non risponde — degrada silenziosamente
    }
  }

  // --- [5] ROUTE DAL DB REGISTRY ---
  const { publicRoutes, privateRoutes } = await resolveRoutes();

  const isPublicRoute = matchesPrefix(pathname, publicRoutes);
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPrivateRoute = matchesPrefix(pathname, privateRoutes);

  const isLoggedIn = !!sessionCookie;

  // Route pubbliche — lascia passare senza check sessione
  if (isPublicRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- [6] ROUTE ADMIN ---
  // Proxy verifica solo sessione valida e non scaduta.
  // RBAC reale avviene nel Server Component via requireAdminPage().
  if (isAdminRoute) {
    if (!isLoggedIn) {
      const url = new URL(ADMIN_SIGNIN_ROUTE, request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    try {
      const parsed = await verifyToken(sessionCookie!.value);
      const notExpired = new Date(parsed.expires) > new Date();
      if (!notExpired) {
        const url = new URL(ADMIN_SIGNIN_ROUTE, request.url);
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
      }
    } catch {
      return NextResponse.redirect(new URL(ADMIN_SIGNIN_ROUTE, request.url));
    }
  }

  // --- [7] ROUTE PRIVATE ---
  if (isPrivateRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // --- [8] REFRESH SESSION ---
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
