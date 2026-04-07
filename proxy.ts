// proxy.ts
// Next.js 16 gira su Node.js runtime — Drizzle è importabile direttamente
import { signToken, verifyToken } from "@/lib/auth/session";
import { db } from "@/lib/db/drizzle";
import { appSettings } from "@/lib/db/schema";
import { ADMIN_ROUTES, ADMIN_SIGNIN_ROUTE, AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/routes";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function getMaintenanceMode(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, "maintenance_mode"))
      .limit(1);
    return row?.value === "true";
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

  // --- ADMIN SIGN-IN: sempre accessibile, gestita prima di tutto ---
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

  // --- MAINTENANCE MODE ---
  // Bypass: /maintenance stessa, /api/*, /admin/*
  const skipMaintenance =
    pathname === "/maintenance" ||
    pathname.startsWith("/api/") ||
    isAdminRoute;

  if (!skipMaintenance) {
    const maintenance = await getMaintenanceMode();
    if (maintenance) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  // --- ROUTE PUBBLICHE ---
  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const isLoggedIn = !!sessionCookie;

  // Utente loggato su /sign-in o /sign-up → home
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Utente non loggato su route protetta → /sign-in
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
