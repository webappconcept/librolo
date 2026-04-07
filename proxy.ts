// proxy.ts
import { signToken, verifyToken } from "@/lib/auth/session";
import { db } from "@/lib/db/drizzle";
import { appSettings } from "@/lib/db/schema";
import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/routes";
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
    console.log("[proxy] maintenance_mode row:", row);
    return row?.value === "true";
  } catch (e) {
    console.error("[proxy] getMaintenanceMode error:", e);
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminSignIn = pathname === "/admin/sign-in";

  console.log("[proxy] pathname:", pathname);
  console.log("[proxy] isAdminPath:", isAdminPath);
  console.log("[proxy] isAdminSignIn:", isAdminSignIn);

  // --- MAINTENANCE MODE ---
  if (!isAdminPath && pathname !== "/maintenance" && !pathname.startsWith("/api/")) {
    const maintenance = await getMaintenanceMode();
    console.log("[proxy] maintenance check result:", maintenance);
    if (maintenance) {
      console.log("[proxy] redirecting to /maintenance");
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  } else {
    console.log("[proxy] skipping maintenance check (isAdminPath or /maintenance or /api)");
  }

  // --- ADMIN SIGN-IN ---
  if (isAdminSignIn) {
    console.log("[proxy] handling admin sign-in");
    if (sessionCookie) {
      try {
        const parsed = await verifyToken(sessionCookie.value);
        if (parsed.user.role === "admin") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch {
        // token non valido
      }
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isLoggedIn = !!sessionCookie;

  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (isAdminPath && isLoggedIn) {
    try {
      const parsed = await verifyToken(sessionCookie!.value);
      if (parsed.user.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  let res = NextResponse.next({ request: { headers: requestHeaders } });

  if (sessionCookie && request.method === "GET") {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
      res.cookies.set({
        name: "session",
        value: await signToken({
          user: { id: parsed.user.id, role: parsed.user.role ?? "member" },
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
