import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow auth endpoints, login, unauthorised, and static assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/unauthorised" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // NextAuth v5 uses "authjs" cookie prefix and reads AUTH_SECRET automatically
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    cookieName:
      req.nextUrl.protocol === "https:"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Inject verified user identity from JWT into request headers.
  // API routes should trust X-Verified-User-Id over client-supplied headers.
  // Prefer token.id (custom claim — always the DB user ID) over token.sub
  // (which may still hold the Google OAuth provider ID for existing sessions).
  const requestHeaders = new Headers(req.headers);
  const dbUserId = (token.id as string) || token.sub;
  if (dbUserId) {
    requestHeaders.set("X-Verified-User-Id", dbUserId);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
