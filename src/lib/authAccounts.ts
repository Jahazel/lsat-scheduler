import bcrypt from "bcryptjs";
import type { Account, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { createAccount, findAccountByEmail } from "./accountRepository";

export async function authorizeCredentials(credentials: Partial<Record<"email" | "password", unknown>> | undefined) {
  const email = credentials?.email;
  const password = credentials?.password;
  if (typeof email !== "string" || typeof password !== "string") return null;

  const account = await findAccountByEmail(email);
  if (!account?.passwordHash) return null;

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) return null;

  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
  };
}

// Google accounts don't go through authorize() — create the Account on
// first sign-in so the jwt callback below always has one to look up.
export async function createGoogleAccountOnSignIn({ user, account }: { user: User; account?: Account | null }) {
  if (account?.provider !== "google") return true;

  const email = user.email?.toLowerCase().trim();
  if (!email) return false;

  await createAccount({ email, name: user.name ?? email, role: "student" });
  return true;
}

export async function accountToken({ token, user, account }: { token: JWT; user?: User; account?: Account | null }) {
  if (!user) return token;

  if (account?.provider === "google") {
    const dbAccount = user.email ? await findAccountByEmail(user.email) : null;
    if (dbAccount) {
      token.id = dbAccount.id;
      token.role = dbAccount.role;
    }
  } else {
    token.id = user.id;
    token.role = user.role;
  }
  return token;
}
