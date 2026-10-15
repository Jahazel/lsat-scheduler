import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authorizeCredentials, createGoogleAccountOnSignIn, accountToken } from "@/lib/authAccounts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    signIn: createGoogleAccountOnSignIn,
    jwt: accountToken,
    async session({ session, token }) {
      if (session.user && typeof token.id === "string" && (token.role === "student" || token.role === "admin")) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
