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
      // Disable PKCE — use state-only verification instead.
      // PKCE cookie encryption intermittently fails on Vercel (nextauth v5 beta.30
      // defaults checks to ["pkce"] but the JWE decode fails across edge/lambda boundaries).
      // State-based verification (anti-CSRF) is sufficient for a confidential server-side client.
      checks: ["state"],
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

      // On initial sign-in or token refresh, look up DB user
      if (trigger === "signIn" || (token.email && !token.id)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email! },
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
