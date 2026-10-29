import type { Account, Profile, User } from "next-auth";
import { attemptAccountDeletion } from "./accountDeletion";
import { createAccount, findAccountByGoogleId, signInMethodForEmail } from "./accountRepository";
import { normalizeEmail } from "./email";
import { DELETION_WILL_FINISH_PATH, DISABLED_SIGN_IN_PATH, EMAIL_USES_PASSWORD_PATH } from "./loginNotice";
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
    if (existing) {
      if (existing.deletingSince) {
        const willFinish = (await attemptAccountDeletion(existing.id, "/api/auth/callback/google")) === "will-finish";
        await log(willFinish ? "deletionWillFinish" : "accountDisabled", { account: existing.id });
        return willFinish ? DELETION_WILL_FINISH_PATH : DISABLED_SIGN_IN_PATH;
      }
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
    await log(usesPassword ? "usesPassword" : "googleRefused", await signInSubject(email));
    return usesPassword ? EMAIL_USES_PASSWORD_PATH : false;
  });
}
