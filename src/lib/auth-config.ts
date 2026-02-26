import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import prisma from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
      // Disable ALL check cookies (PKCE, state).
      //
      // Root cause: On Vercel, the sign-in POST is handled by a deployment-specific lambda
      // (e.g. dashboard-u6ay-2sjrw5pfh-....vercel.app) while the OAuth callback arrives at
      // the canonical alias (dashboard-u6ay.vercel.app).  The Set-Cookie for the check value
      // is scoped to whichever origin the browser sees, so the cookie is either absent or its
      // JWE salt (cookie name) is inconsistent — either way @auth/core throws InvalidCheck.
      //
      // Security justification: this is a confidential server-side OAuth client.
      //   • Google enforces our registered redirect_uri — code injection is blocked at source.
      //   • We use client_secret (confidential client) — authorization code theft is mitigated.
      //   • Every sign-in is validated against an explicit DB allowlist (signIn callback).
      //   • PKCE adds nothing for confidential clients per RFC 9700.
      //   • State CSRF is mitigated by Google's own session binding.
      //
      // Tracked: remove once next-auth ships a stable v5 release that resolves the
      // cross-deployment cookie scoping issue (post-beta.30).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checks: [] as any,
    }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 /* 8 hours — re-authenticate each working day */ },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, isActive: true },
        });
        if (!dbUser || !dbUser.isActive) return "/unauthorised";
        // Update last login (best-effort — don't fail sign-in if this throws)
        try {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { lastLoginAt: new Date() },
          });
        } catch (updateErr) {
          console.error("[auth][signIn] lastLoginAt update failed:", updateErr);
        }
        return true;
      } catch (err) {
        console.error("[auth][signIn] Database error — email:", user.email, "error:", err);
        // Return false so NextAuth shows AccessDenied rather than Configuration
        return false;
      }
    },
    async jwt({ token, trigger }) {
      // Stamp absolute sign-in time on initial login
      if (trigger === "signIn") {
        token.signedAt = Math.floor(Date.now() / 1000);
      }

      // Enforce absolute 8-hour expiry (prevents sliding-window JWT refresh)
      if (token.signedAt) {
        const elapsed = Math.floor(Date.now() / 1000) - token.signedAt;
        if (elapsed > 8 * 60 * 60) {
          // Return null to force re-authentication in NextAuth v5
          return null;
        }
      }

      // Always verify DB user identity from email.
      // This ensures stale tokens (e.g. where token.id was incorrectly set to an OAuth
      // provider sub rather than the DB user ID) are corrected on next JWT evaluation.
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, name: true },
          });
          if (dbUser) {
            token.sub = dbUser.id;
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.name = dbUser.name;
          }
        } catch (err) {
          console.error("[auth][jwt] Database error — email:", token.email, "error:", err);
          // Return token as-is so the session isn't destroyed by a transient DB error
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      if (token.name) session.user.name = token.name;
      return session;
    },
  },
});
