import bcrypt from "bcryptjs";
import type { Account, Profile, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { createAccount, findAccountByEmail, findAccountByGoogleId } from "./accountRepository";

export async function authorizeCredentials(credentials: Partial<Record<"email" | "password", unknown>> | undefined) {
  const email = credentials?.email;
  const password = credentials?.password;
  if (typeof email !== "string" || typeof password !== "string") return null;

  const account = await findAccountByEmail(email);
  if (!account?.passwordHash || account.role === "admin") return null;

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
// first sign-in so the jwt callback below always has one to look up. An email
// match never attaches a Google ID to an existing Account.
export async function createGoogleAccountOnSignIn({ user, account, profile }: {
  user: User;
  account?: Account | null;
  profile?: Profile;
}) {
  if (account?.provider !== "google") return true;

  const googleId = account.providerAccountId;
  const email = user.email?.toLowerCase().trim();
  if (!googleId || !email || profile?.email_verified !== true) return false;

  if (await findAccountByGoogleId(googleId)) return true;
  if (await createAccount({ email, name: user.name ?? email, googleId, role: "student" })) return true;
  // A concurrent first sign-in with this ID may have won the insert.
  return (await findAccountByGoogleId(googleId)) !== null;
}

export async function accountToken({ token, user, account }: { token: JWT; user?: User; account?: Account | null }) {
  if (!user) return token;

  if (account?.provider === "google") {
    const dbAccount = await findAccountByGoogleId(account.providerAccountId);
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
