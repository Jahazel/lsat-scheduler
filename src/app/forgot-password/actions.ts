"use server";

import { TransactionRollbackError } from "drizzle-orm";
import { z } from "zod";
import { resetYourPassword, verifyYourEmail, youSignInWithGoogle } from "@/lib/accountEmails";
import { signInMethodForEmail } from "@/lib/accountRepository";
import { countAction, signupLimits } from "@/lib/actionLimits";
import { clientIpAddress } from "@/lib/clientIpAddress";
import { sendEmail } from "@/lib/email";
import { newEmailToken } from "@/lib/emailToken";
import { saveResetToken } from "@/lib/passwordResetRepository";
import { renewPendingSignupLink } from "@/lib/pendingSignupRepository";
import { getPostgresDatabase } from "@/lib/postgres";

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
  const emailCount = await countAction("resetEmailInHour", email, realNow);
  const ipAddressCount = await countAction("resetFromIpAddress", ipAddress, realNow);
  if (!emailCount.allowed || !ipAddressCount.allowed) return sent;

  const { token, tokenHash } = newEmailToken();
  if (await saveResetToken(email, tokenHash, realNow)) {
    await sendEmail(resetYourPassword(email, token));
  } else if ((await signInMethodForEmail(email)) === "google") {
    await sendEmail(youSignInWithGoogle(email, "reset"));
  } else {
    const name = await renewPendingSignupWithinLimits(email, ipAddress, tokenHash, realNow);
    if (name) await sendEmail(verifyYourEmail(email, name, token));
  }
  return sent;
}

async function renewPendingSignupWithinLimits(email: string, ipAddress: string, tokenHash: string, realNow: Date) {
  try {
    return await getPostgresDatabase().transaction(async (tx) => {
      for (const [action, subject] of signupLimits(email, ipAddress)) {
        if (!(await countAction(action, subject, realNow, tx)).allowed) tx.rollback();
      }
      return (await renewPendingSignupLink(email, tokenHash, realNow, tx)) ?? tx.rollback();
    });
  } catch (error) {
    if (error instanceof TransactionRollbackError) return null;
    throw error;
  }
}
