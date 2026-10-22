import bcrypt from "bcryptjs";
import type { Account, Profile, User } from "next-auth";
import { createAccount, findAccountByEmail, findAccountByGoogleId } from "./accountRepository";

export async function authorizeCredentials(credentials: Partial<Record<"email" | "password", unknown>> | undefined) {
  const email = credentials?.email;
  const password = credentials?.password;
  if (typeof email !== "string" || typeof password !== "string") return null;

  const account = await findAccountByEmail(email);
  if (!account?.passwordHash || account.role === "admin" || account.disabledAt) return null;

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) return null;

  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
  };
}

export const DISABLED_SIGN_IN_PATH = "/login?error=AccountDisabled";

export async function createGoogleAccountOnSignIn({ user, account, profile }: {
  user: User;
  account?: Account | null;
  profile?: Profile;
}) {
  if (account?.provider !== "google") return true;

  const googleId = account.providerAccountId;
  const email = user.email?.toLowerCase().trim();
  if (!googleId || !email || profile?.email_verified !== true) return false;

  const existing = await findAccountByGoogleId(googleId);
  if (existing) return existing.disabledAt ? DISABLED_SIGN_IN_PATH : true;
  if (await createAccount({ email, name: user.name ?? email, googleId, role: "student" })) return true;
  // A concurrent first sign-in with this ID may have won the insert.
  return (await findAccountByGoogleId(googleId)) !== null;
}
