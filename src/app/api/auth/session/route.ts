import { NextResponse } from "next/server";
import { handlers } from "@/lib/auth-config";

// This route takes precedence over the [...nextauth] catch-all for
// /api/auth/session. In dev (DEV_BYPASS_AUTH=true) it returns a mock session
// so useSession() resolves without a real JWT. In all other environments it
// delegates to the real NextAuth handler so production auth is unaffected.
export async function GET(req: Request) {
  // Guard: dev bypass must never run in production
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "true" && process.env.DEV_SESSION_EMAIL) {
    return NextResponse.json({
      user: {
        name: process.env.DEV_SESSION_NAME ?? process.env.DEV_SESSION_EMAIL,
        email: process.env.DEV_SESSION_EMAIL,
        image: null,
      },
      expires: "2027-12-31T00:00:00.000Z",
    });
  }

  // Production / non-dev: delegate to the real NextAuth session handler.
  return handlers.GET(req as Parameters<typeof handlers.GET>[0]);
}
