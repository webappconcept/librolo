// proxy.ts
import { signToken, verifyToken } from "@/lib/auth/session";
import { ADMIN_ROUTES, AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/routes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session");

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isAdminRoute = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  // ── Maintenance mode ──────────────────────────────────────────────────
  // Salta il check per /maintenance stesso, route admin e API
  if (
    pathname !== "/maintenance" &&
    !isAdminRoute &&
    !pathname.startsWith("/api")
  ) {
    let maintenanceEnabled = false;
    try {
      const res = await fetch(new URL("/api/maintenance", request.url), {
        next: { revalidate: 60 }, // cache 60s — evita query DB ad ogni richiesta
      });
      const data = await res.json();
      maintenanceEnabled = data.enabled === true;
    } catch {
      maintenanceEnabled = false; // fail open — in caso di errore non bloccare
    }

    if (maintenanceEnabled) {
      // Admin loggato bypassa sempre
      if (sessionCookie) {
        try {
          const parsed = await verifyToken(sessionCookie.value);
          if (parsed.user.role === "admin") {
            // admin → lascia passare, non fare nulla qui
          } else {
            return NextResponse.rewrite(new URL("/maintenance", request.url));
          }
        } catch {
          return NextResponse.rewrite(new URL("/maintenance", request.url));
        }
      } else {
        // Non loggato → blocca sempre
        return NextResponse.rewrite(new URL("/maintenance", request.url));
      }
    }
  }

  // Redirect da /maintenance → / quando maintenance è OFF
  if (pathname === "/maintenance") {
    try {
      const res = await fetch(new URL("/api/maintenance", request.url), {
        next: { revalidate: 60 },
      });
      const data = await res.json();
      if (data.enabled !== true) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {}
  }
  // ─────────────────────────────────────────────────────────────────────

  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  const isLoggedIn = !!sessionCookie;

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Check ruolo admin
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

  // Refresh token su GET
  let res = NextResponse.next();
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
