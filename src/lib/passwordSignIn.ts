import { CredentialsSignin } from "next-auth";
import { findPasswordAccountByEmail } from "./accountRepository";
import { countAll, giveBack, loginTryCounts } from "./actionLimits";
import { clientIpAddress } from "./clientIpAddress";
import { passwordMatches } from "./passwordHash";
import { passwordTooLong } from "./passwordRules";
import { findPendingSignup } from "./pendingSignupRepository";
import { resendVerificationLink } from "./verificationResend";

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
    await resendVerificationLink(email, ipAddress, pending, realNow);
    throw new LoginRefused("verifyYourEmail");
  }
  if (!account || account.role === "admin") throw new LoginRefused("wrongEmailOrPassword");
  if (account.disabledAt) throw new LoginRefused("accountDisabled");
  return { id: account.id, email: account.email, name: account.name, sessionVersion: account.sessionVersion };
}
