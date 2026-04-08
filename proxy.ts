// proxy.ts
import { signToken, verifyToken } from "@/lib/auth/session";
import { ADMIN_ROUTES, ADMIN_SIGNIN_ROUTE, AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/routes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Route private conosciute: solo queste richiedono autenticazione.
 * Qualsiasi percorso che non inizia con uno di questi prefissi
 * viene lasciato passare — se non esiste, Next.js mostrerà il 404.
 */
const PRIVATE_ROUTE_PREFIXES = [
  "/dashboard",
  "/profilo",
  "/account",
  "/libreria",
  "/esplora",
  "/assistenza",
  "/segnala",
];

function isKnownPrivateRoute(pathname: string): boolean {
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isAdminRoute = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isAdminSignIn = pathname === ADMIN_SIGNIN_ROUTE;
  const isPrivateRoute = isKnownPrivateRoute(pathname);

  // --- ADMIN SIGN-IN: sempre accessibile ---
  if (isAdminSignIn) {
    if (sessionCookie) {
      try {
        const parsed = await verifyToken(sessionCookie.value);
        if (parsed.user.role === "admin") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch {
        // token non valido, lascia passare
      }
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- ROUTE PUBBLICHE (non-auth) ---
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

  // --- ROUTE ADMIN: richiede ruolo admin ---
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/sign-in", request.url));
    }
    try {
      const parsed = await verifyToken(sessionCookie!.value);
      if (parsed.user.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/admin/sign-in", request.url));
    }
  }

  // --- ROUTE PRIVATE CONOSCIUTE: richiede login ---
  // Solo le route esplicitamente elencate in PRIVATE_ROUTE_PREFIXES
  // vengono protette. Route sconosciute passano e mostrano il 404.
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
      // Solo se era su una route privata nota, redirect al login
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
