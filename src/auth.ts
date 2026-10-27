import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { createGoogleAccountOnSignIn } from "@/lib/authAccounts";
import { passwordSignInAccount } from "@/lib/passwordSignIn";
import { accountSessionToken, SESSION_IDLE_SECONDS } from "@/lib/accountSession";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: SESSION_IDLE_SECONDS },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [Google, Credentials({ credentials: { email: {}, password: {} }, authorize: passwordSignInAccount })],
  callbacks: {
    signIn: createGoogleAccountOnSignIn,
    jwt: accountSessionToken,
    async session({ session, token }) {
      if (session.user && typeof token.id === "string" && (token.role === "student" || token.role === "admin")) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.signedInAt = token.signedInAt;
      }
      return session;
    },
  },
});
