import type { Account, Profile, User } from "next-auth";
import { createAccount, findAccountByGoogleId } from "./accountRepository";
import { DISABLED_SIGN_IN_PATH } from "./loginNotice";

export async function createGoogleAccountOnSignIn({ user, account, profile }: {
  user: User;
  account?: Account | null;
  profile?: Profile;
}) {
  if (account?.provider !== "google") return false;

  const googleId = account.providerAccountId;
  const email = user.email?.toLowerCase().trim();
  if (!googleId || !email || profile?.email_verified !== true) return false;

  const existing = await findAccountByGoogleId(googleId);
  if (existing) return existing.disabledAt ? DISABLED_SIGN_IN_PATH : true;
  if (await createAccount({ email, name: user.name ?? email, googleId })) return true;
  // A concurrent first sign-in with this ID may have won the insert.
  return (await findAccountByGoogleId(googleId)) !== null;
}
