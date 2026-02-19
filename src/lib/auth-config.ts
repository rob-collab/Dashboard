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
    }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 /* 8 hours — re-authenticate each working day */ },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, isActive: true },
      });
      if (!dbUser || !dbUser.isActive) return "/unauthorised";
      // Update last login
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date() },
      });
      return true;
    },
    async jwt({ token, trigger }) {
      // On initial sign-in or token refresh, look up DB user
      if (trigger === "signIn" || (token.email && !token.id)) {
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
