"use server";

import { z } from "zod";
import { resetYourPassword, youSignInWithGoogle } from "@/lib/accountEmails";
import { signInMethodForEmail } from "@/lib/accountRepository";
import { countAll } from "@/lib/actionLimits";
import { clientIpAddress } from "@/lib/clientIpAddress";
import { sendEmail } from "@/lib/email";
import { newEmailToken } from "@/lib/emailToken";
import { saveResetToken } from "@/lib/passwordResetRepository";
import { findPendingSignup } from "@/lib/pendingSignupRepository";
import { resendVerificationLink } from "@/lib/verificationResend";

export type ForgotPasswordState = { kind: "form"; error?: string } | { kind: "sent"; email: string };

const ForgotPasswordFields = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

export async function requestPasswordReset(_state: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const parsed = ForgotPasswordFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { kind: "form", error: "Enter a valid email." };
  const { email } = parsed.data;
  const sent: ForgotPasswordState = { kind: "sent", email };

  const realNow = new Date();
  const ipAddress = await clientIpAddress();
  if (await countAll([["resetEmailInHour", email], ["resetFromIpAddress", ipAddress]], realNow)) return sent;

  const { token, tokenHash } = newEmailToken();
  if (await saveResetToken(email, tokenHash, realNow)) {
    await sendEmail(resetYourPassword(email, token));
  } else if ((await signInMethodForEmail(email)) === "google") {
    await sendEmail(youSignInWithGoogle(email, "reset"));
  } else {
    const pending = await findPendingSignup(email, realNow);
    if (pending) await resendVerificationLink(email, ipAddress, pending, realNow);
  }
  return sent;
}
