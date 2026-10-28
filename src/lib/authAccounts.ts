import type { Account, Profile, User } from "next-auth";
import { createAccount, findAccountByEmail, findAccountByGoogleId, signInMethodForEmail } from "./accountRepository";
import { normalizeEmail } from "./email";
import { DISABLED_SIGN_IN_PATH, EMAIL_USES_PASSWORD_PATH } from "./loginNotice";
import { NOBODY, recordSecurityEvent, type Subject } from "./securityLog";

export async function createGoogleAccountOnSignIn({ user, account, profile }: {
  user: User;
  account?: Account | null;
  profile?: Profile;
}) {
  if (account?.provider === "credentials") return true;
  const log = (result: "signedIn" | "accountDisabled" | "usesPassword" | "googleRefused", who: Subject) =>
    recordSecurityEvent({ event: "sign_in", result, route: "/api/auth/callback/google", who });
  if (account?.provider !== "google") return false;

  const googleId = account.providerAccountId;
  const email = user.email ? normalizeEmail(user.email) : undefined;
  if (!googleId || !email || profile?.email_verified !== true) {
    await log("googleRefused", NOBODY);
    return false;
  }

  const existing = await findAccountByGoogleId(googleId);
  if (existing) {
    await log(existing.disabledAt ? "accountDisabled" : "signedIn", { account: existing.id });
    return existing.disabledAt ? DISABLED_SIGN_IN_PATH : true;
  }
  // A concurrent first sign-in with this ID may have won the insert.
  const created = await createAccount({ email, name: user.name ?? email, googleId }) ?? await findAccountByGoogleId(googleId);
  if (created) {
    await log("signedIn", { account: created.id });
    return true;
  }
  const usesPassword = (await signInMethodForEmail(email)) === "password";
  const holder = await findAccountByEmail(email);
  await log(usesPassword ? "usesPassword" : "googleRefused", holder ? { account: holder.id } : NOBODY);
  return usesPassword ? EMAIL_USES_PASSWORD_PATH : false;
}
