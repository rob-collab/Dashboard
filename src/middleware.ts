import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dev bypass: set DEV_BYPASS_AUTH=true and DEV_USER_ID=<your-db-id> in .env.local
  // Guard: this code must never run in production
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "true" && process.env.DEV_USER_ID) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("X-Verified-User-Id", process.env.DEV_USER_ID);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

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

  // Belt-and-braces: enforce absolute 8-hour expiry at the edge
  if (token.signedAt) {
    const elapsed = Math.floor(Date.now() / 1000) - (token.signedAt as number);
    if (elapsed > 8 * 60 * 60) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("reason", "session_expired");
      return NextResponse.redirect(loginUrl);
    }
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

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Security headers — applied to every authenticated response
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
