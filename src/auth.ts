import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createGoogleAccountOnSignIn } from "@/lib/authAccounts";
import { accountSessionToken, SESSION_IDLE_SECONDS } from "@/lib/accountSession";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: SESSION_IDLE_SECONDS },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [Google],
  callbacks: {
    signIn: createGoogleAccountOnSignIn,
    jwt: accountSessionToken,
    async session({ session, token }) {
      if (session.user && typeof token.id === "string" && (token.role === "student" || token.role === "admin")) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
