"use server";

import { TransactionRollbackError } from "drizzle-orm";
import { z } from "zod";
import { signIn } from "@/auth";
import { verifyYourEmail, youAlreadyHaveAnAccount, youSignInWithGoogle } from "@/lib/accountEmails";
import { signInMethodForEmail } from "@/lib/accountRepository";
import { countAction, type LimitedAction } from "@/lib/actionLimits";
import { clientIpAddress } from "@/lib/clientIpAddress";
import { sendEmail } from "@/lib/email";
import { newEmailToken } from "@/lib/emailToken";
import { getPostgresDatabase } from "@/lib/postgres";
import { hashPassword } from "@/lib/passwordHash";
import { newPasswordProblem, PASSWORD_MESSAGES, type PasswordProblem } from "@/lib/passwordRules";
import { savePendingSignup } from "@/lib/pendingSignupRepository";

export type SignupState =
  | { kind: "form"; errors: { name?: string; email?: string; password?: string; terms?: string } }
  | { kind: "checkYourEmail"; email: string };

const SignupFields = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(200, "Use a shorter name."),
  email: z.string().trim().toLowerCase().max(254, "Enter a valid email.").pipe(z.email("Enter a valid email.")),
  password: z.string(),
});

export async function signUpWithGoogle() {
  await signIn("google", { redirectTo: "/onboarding" });
}

export async function signUpWithPassword(_state: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = SignupFields.safeParse(Object.fromEntries(formData));
  if (formData.get("agreedToTerms") !== "on") return { kind: "form", errors: { terms: "Tick the box to continue." } };
  if (!parsed.success) {
    const { name, email } = z.flattenError(parsed.error).fieldErrors;
    return { kind: "form", errors: { name: name?.[0], email: email?.[0] } };
  }
  const { name, email, password } = parsed.data;
  const checkYourEmail: SignupState = { kind: "checkYourEmail", email };

  const realNow = new Date();
  const refusal = await signupRefusal(email, await clientIpAddress(), password, realNow);
  if (refusal === "overLimit") return checkYourEmail;
  if (refusal) return { kind: "form", errors: { password: PASSWORD_MESSAGES[refusal] } };

  const method = await signInMethodForEmail(email);
  if (method === "password") {
    await sendEmail(youAlreadyHaveAnAccount(email));
  } else if (method === "google") {
    await sendEmail(youSignInWithGoogle(email));
  } else {
    const { token, tokenHash } = newEmailToken();
    await savePendingSignup({ email, name, passwordHash: await hashPassword(password), tokenHash }, realNow);
    await sendEmail(verifyYourEmail(email, name, token));
  }
  return checkYourEmail;
}

// The limits come first, so a signup over a limit shows the same screen whatever its password.
// A refused signup sends nothing, so it gives back every count it took.
async function signupRefusal(email: string, ipAddress: string, password: string, realNow: Date) {
  const counted: [LimitedAction, string][] = [
    ["signupEmailInHour", email], ["signupEmailInDay", email], ["signupFromIpAddress", ipAddress],
  ];
  let refusal: PasswordProblem | "overLimit" | null = null;
  try {
    await getPostgresDatabase().transaction(async (tx) => {
      for (const [action, subject] of counted) {
        if (!(await countAction(action, subject, realNow, tx)).allowed) {
          refusal = "overLimit";
          tx.rollback();
        }
      }
      refusal = newPasswordProblem(password, email);
      if (refusal) tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return refusal;
}
