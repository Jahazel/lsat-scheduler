import { CredentialsSignin } from "next-auth";
import { verifyYourEmail } from "./accountEmails";
import { findPasswordAccountByEmail } from "./accountRepository";
import { countAction, limitReached } from "./actionLimits";
import { clientIpAddress } from "./clientIpAddress";
import { sendEmail } from "./email";
import { newEmailToken } from "./emailToken";
import { passwordMatches } from "./passwordHash";
import { passwordTooLong } from "./passwordRules";
import { findPendingSignup, savePendingSignup } from "./pendingSignupRepository";
import { signupLimitRefusal } from "./signupLimits";

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
  if (await limitReached("failedLoginForEmail", email, realNow) || await limitReached("failedLoginFromIpAddress", ipAddress, realNow)) {
    throw new LoginRefused("paused");
  }

  const account = await findPasswordAccountByEmail(email);
  const pending = account ? null : await findPendingSignup(email, realNow);
  if (!(await passwordMatches(password, account?.passwordHash ?? pending?.passwordHash ?? null))) {
    await countAction("failedLoginForEmail", email, realNow);
    await countAction("failedLoginFromIpAddress", ipAddress, realNow);
    throw new LoginRefused("wrongEmailOrPassword");
  }
  if (pending) {
    if (!(await signupLimitRefusal(email, ipAddress, realNow))) {
      const { token, tokenHash } = newEmailToken();
      await savePendingSignup({ ...pending, tokenHash }, realNow);
      await sendEmail(verifyYourEmail(email, pending.name, token));
    }
    throw new LoginRefused("verifyYourEmail");
  }
  if (!account || account.role === "admin") throw new LoginRefused("wrongEmailOrPassword");
  if (account.disabledAt) throw new LoginRefused("accountDisabled");
  return { id: account.id, email: account.email, name: account.name };
}
