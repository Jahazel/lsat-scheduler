import type { Account, Profile, User } from "next-auth";
import { createAccount, findAccountByGoogleId, signInMethodForEmail } from "./accountRepository";
import { normalizeEmail } from "./email";
import { EMAIL_USES_PASSWORD_PATH, loginRefusalPath } from "./loginNotice";
import { answerGoogleSignIn, NOBODY, recordSecurityEvent, signInSubject, type SecurityResult, type SignInSubject } from "./securityLog";
import { admitAccount } from "./signInGate";

const GOOGLE_CALLBACK = "/api/auth/callback/google";

export async function createGoogleAccountOnSignIn({ user, account, profile }: {
  user: User;
  account?: Account | null;
  profile?: Profile;
}) {
  if (account?.provider === "credentials") return true;
  return answerGoogleSignIn(async () => {
    const log = (result: SecurityResult<"sign_in">, who: SignInSubject) =>
      recordSecurityEvent({ event: "sign_in", result, route: GOOGLE_CALLBACK, who });
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
      const admission = await admitAccount(existing, { route: GOOGLE_CALLBACK, realNow: new Date() });
      await log(admission, { account: existing.id });
      return admission === "signedIn" || loginRefusalPath(admission);
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

/** Auth.js sends a cancel at Google (`error=access_denied`) to Login as `error=Configuration`, the same as a real setup fault. */
export async function recordGoogleCallbackFailure(requestUrl: URL, response: Response) {
  if (requestUrl.pathname !== GOOGLE_CALLBACK) return;
  const googleError = requestUrl.searchParams.get("error");
  const loginError = new URL(response.headers.get("Location") ?? "", requestUrl).searchParams.get("error");
  if (googleError === null && loginError !== "Configuration") return;
  await recordSecurityEvent({
    event: "sign_in", result: googleError === "access_denied" ? "googleCancelled" : "setupFault", route: GOOGLE_CALLBACK, who: NOBODY,
  });
}
