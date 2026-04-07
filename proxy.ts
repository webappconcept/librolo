// proxy.ts
import { signToken, verifyToken } from "@/lib/auth/session";
import { ADMIN_ROUTES, ADMIN_SIGNIN_ROUTE, AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/routes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function isMaintenanceEnabled(request: NextRequest): Promise<boolean> {
  try {
    const url = new URL("/api/maintenance", request.url);
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return false;
    const data = await res.json();
    return data.enabled === true;
  } catch {
    return false;
  }
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

  // --- MAINTENANCE MODE ---
  // Lascia passare sempre: /maintenance, /api/*, /admin/*
  const isMaintenance = pathname === "/maintenance";
  const isApiRoute = pathname.startsWith("/api/");

  if (!isMaintenance && !isApiRoute && !isAdminRoute) {
    const maintenance = await isMaintenanceEnabled(request);
    if (maintenance) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  // --- ADMIN SIGN-IN: lascia passare sempre, senza check sessione admin ---
  if (isAdminSignIn) {
    // Se è già loggato come admin, redirect alla dashboard admin
    if (sessionCookie) {
      try {
        const parsed = await verifyToken(sessionCookie.value);
        if (parsed.user.role === "admin") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch {
        // token non valido, lascia andare alla pagina
      }
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- ROUTE PUBBLICHE ---
  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const isLoggedIn = !!sessionCookie;

  // Utente loggato che tenta di andare su /sign-in o /sign-up
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Utente non loggato su route protetta
  if (!isPublicRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // --- ROUTE ADMIN: richiede ruolo admin ---
  if (isAdminRoute && isLoggedIn) {
    try {
      const parsed = await verifyToken(sessionCookie!.value);
      if (parsed.user.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  // --- REFRESH SESSION ---
  let res = NextResponse.next({
    request: { headers: requestHeaders },
  });

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
      if (!isPublicRoute) {
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
