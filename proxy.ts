// proxy.ts
import { signToken, verifyToken } from "@/lib/auth/session";
import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/routes";
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

  // Route pubbliche → passa sempre
  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  const isLoggedIn = !!sessionCookie;

  // Utente loggato su pagine auth (sign-in, sign-up) → redirect home
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Route non pubblica senza sessione → redirect sign-in
  if (!isPublicRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
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
          ...parsed,
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
