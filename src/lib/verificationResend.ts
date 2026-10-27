import { verifyYourEmail } from "./accountEmails";
import { countAll, signupCounts } from "./actionLimits";
import { sendEmail } from "./email";
import { newEmailToken } from "./emailToken";
import { replaceVerificationToken } from "./pendingSignupRepository";

/** Sends a pending signup a new verification link, which stops the older one. Over a signup limit, it sends nothing. */
export async function resendVerificationLink(
  email: string, ipAddress: string, pending: { name: string; passwordHash: string }, realNow: Date,
) {
  if (await countAll(signupCounts(email, ipAddress), realNow)) return;
  const { token, tokenHash } = newEmailToken();
  if (await replaceVerificationToken({ email, passwordHash: pending.passwordHash, tokenHash }, realNow)) {
    await sendEmail(verifyYourEmail(email, pending.name, token));
  }
}
