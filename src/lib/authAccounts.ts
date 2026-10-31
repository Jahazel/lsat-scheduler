import type { Account, Profile, User } from "next-auth";
import { createAccount, findAccountByGoogleId, recordSignIn, signInMethodForEmail } from "./accountRepository";
import { normalizeEmail } from "./email";
import { finishDeletionOnSignIn } from "./accountDeletion";
import { DELETING_SIGN_IN_PATHS, DISABLED_SIGN_IN_PATH, EMAIL_USES_PASSWORD_PATH } from "./loginNotice";
import { answerGoogleSignIn, NOBODY, recordSecurityEvent, signInSubject, type SecurityResult, type SignInSubject } from "./securityLog";

export async function createGoogleAccountOnSignIn({ user, account, profile }: {
  user: User;
  account?: Account | null;
  profile?: Profile;
}) {
  if (account?.provider === "credentials") return true;
  return answerGoogleSignIn(async () => {
    const log = (result: SecurityResult<"sign_in">, who: SignInSubject) =>
      recordSecurityEvent({ event: "sign_in", result, route: "/api/auth/callback/google", who });
    if (account?.provider !== "google") return false;

    const googleId = account.providerAccountId;
    const email = user.email ? normalizeEmail(user.email) : undefined;
    if (!googleId || !email || profile?.email_verified !== true) {
      // Issue 140: an unverified Google email never looks an Account up, so the entry keeps only its hash.
      await log("googleRefused", email ? { unknownEmail: email } : NOBODY);
      return false;
    }

    const existing = await findAccountByGoogleId(googleId);
    if (existing?.disabledAt && !existing.deletingSince) {
      await log("accountDisabled", { account: existing.id });
      return DISABLED_SIGN_IN_PATH;
    }
    if (existing && (existing.deletingSince || !(await recordSignIn(existing.id, new Date())))) {
      const refusal = await finishDeletionOnSignIn(existing.id, "/api/auth/callback/google");
      await log(refusal, { account: existing.id });
      return DELETING_SIGN_IN_PATHS[refusal];
    }
    if (existing) {
      await log("signedIn", { account: existing.id });
      return true;
    }
    // A concurrent first sign-in with this ID may have won the insert.
    const created = await createAccount({ email, name: user.name ?? email, googleId }) ?? await findAccountByGoogleId(googleId);
    if (created) {
      await log("signedIn", { account: created.id });
      return true;
    }
    const usesPassword = (await signInMethodForEmail(email)) === "password";
    await log(usesPassword ? "usesPassword" : "googleRefused", await signInSubject(email));
    return usesPassword ? EMAIL_USES_PASSWORD_PATH : false;
  });
}
