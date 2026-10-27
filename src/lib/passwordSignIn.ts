import { CredentialsSignin } from "next-auth";
import { verifyYourEmail } from "./accountEmails";
import { findPasswordAccountByEmail } from "./accountRepository";
import { countAll, giveBack, loginTryCounts, signupCounts } from "./actionLimits";
import { clientIpAddress } from "./clientIpAddress";
import { sendEmail } from "./email";
import { newEmailToken } from "./emailToken";
import { passwordMatches } from "./passwordHash";
import { passwordTooLong } from "./passwordRules";
import { findPendingSignup, replaceVerificationToken } from "./pendingSignupRepository";

export type LoginRefusal = "wrongEmailOrPassword" | "paused" | "tooLong" | "verifyYourEmail" | "accountDisabled";

/** Auth.js hands this error, with its `code`, back to the server action that called `signIn`. */
export class LoginRefused extends CredentialsSignin {
  constructor(readonly code: LoginRefusal) {
    super();
  }
}

export async function passwordSignInAccount(credentials: Partial<Record<"email" | "password", unknown>>) {
  const { email: typedEmail, password } = credentials;
  if (typeof typedEmail !== "string" || typeof password !== "string") throw new LoginRefused("wrongEmailOrPassword");
  if (passwordTooLong(password)) throw new LoginRefused("tooLong");

  const email = typedEmail.trim().toLowerCase();
  const ipAddress = await clientIpAddress();
  const realNow = new Date();
  const tries = loginTryCounts(email, ipAddress);
  if (await countAll(tries, realNow)) throw new LoginRefused("paused");

  const account = await findPasswordAccountByEmail(email);
  const pending = account ? null : await findPendingSignup(email, realNow);
  if (!(await passwordMatches(password, account?.passwordHash ?? pending?.passwordHash ?? null))) {
    throw new LoginRefused("wrongEmailOrPassword");
  }
  await giveBack(tries, realNow);
  if (pending) {
    const { token, tokenHash } = newEmailToken();
    if (!(await countAll(signupCounts(email, ipAddress), realNow))
      && await replaceVerificationToken({ email, passwordHash: pending.passwordHash, tokenHash }, realNow)) {
      await sendEmail(verifyYourEmail(email, pending.name, token));
    }
    throw new LoginRefused("verifyYourEmail");
  }
  if (!account || account.role === "admin") throw new LoginRefused("wrongEmailOrPassword");
  if (account.disabledAt) throw new LoginRefused("accountDisabled");
  return { id: account.id, email: account.email, name: account.name };
}
