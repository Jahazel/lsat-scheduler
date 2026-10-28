import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { createGoogleAccountOnSignIn } from "@/lib/authAccounts";
import { passwordRequest } from "@/lib/clientIpAddress";
import { logIn, type LoginRefusal } from "@/lib/passwordAccount";
import { accountSessionToken, SESSION_IDLE_SECONDS } from "@/lib/accountSession";

/** Auth.js hands this error, with its `code`, back to the server action that called `signIn`. */
export class LoginRefused extends CredentialsSignin {
  constructor(readonly code: LoginRefusal) {
    super();
  }
}

export async function passwordSignInAccount(credentials: Partial<Record<"email" | "password", unknown>>) {
  const result = await logIn(credentials, await passwordRequest("/login"));
  if (result.kind === "refused") throw new LoginRefused(result.code);
  return result.user;
}

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
