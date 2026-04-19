// proxy.ts
import { signToken, verifyToken } from "@/lib/auth/session";
import { getRedirectByFromPath } from "@/lib/db/redirects-queries";
import { getActiveRoutes } from "@/lib/db/route-registry-queries";
import { ADMIN_SIGNIN_ROUTE, ADMIN_ROUTES } from "@/lib/routes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Route admin conosciute: hard-coded perché le route /admin/* non sono
 * nel route_registry (non sono route pubbliche del sito) e devono
 * essere protette anche se il DB non risponde.
 */
const ADMIN_ROUTE_PREFIXES = ADMIN_ROUTES;

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // --- REDIRECT DA DB (301/302/307/308) ---
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
      // Degrada silenziosamente se il DB non risponde
    }
  }

  // --- ADMIN SIGN-IN: sempre accessibile ---
  if (pathname === ADMIN_SIGNIN_ROUTE) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- ROUTE ADMIN ---
  if (isAdminRoute(pathname)) {
    const isLoggedIn = !!sessionCookie;
    if (!isLoggedIn) {
      const url = new URL("/admin/sign-in", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    try {
      const payload = await verifyToken(sessionCookie.value);
      if (!payload) {
        const url = new URL("/admin/sign-in", request.url);
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
      }
      const newToken = await signToken(payload);
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.cookies.set("session", newToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: new Date(payload.expires),
      });
      return response;
    } catch {
      const url = new URL("/admin/sign-in", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // --- ROUTE REGISTRY DAL DB ---
  // Fallback statico: se il DB non risponde lasciamo passare la request
  // e lasciamo che Next.js mostri 404 o la pagina corretta.
  let routes: Awaited<ReturnType<typeof getActiveRoutes>> = [];
  try {
    routes = await getActiveRoutes();
  } catch {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const matched = routes.find(
    (r) => pathname === r.pathname || pathname.startsWith(r.pathname + "/"),
  );

  // Pathname non registrato nel registry → lascia passare (Next.js gestisce 404)
  if (!matched) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const isLoggedIn = !!sessionCookie;
  const { visibility } = matched;

  // Rotta auth-only (/sign-in, /sign-up, ecc.)
  if (visibility === "auth-only") {
    if (isLoggedIn) {
      // Utente già loggato → rimanda alla home
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Rotta pubblica → sempre accessibile
  if (visibility === "public") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Rotta privata o admin → richiede sessione valida
  if (!isLoggedIn) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const payload = await verifyToken(sessionCookie.value);
    if (!payload) {
      const url = new URL("/sign-in", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    const newToken = await signToken(payload);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set("session", newToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: new Date(payload.expires),
    });
    return response;
  } catch {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
}
