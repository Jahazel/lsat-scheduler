"use server";

import { z } from "zod";
import { signIn } from "@/auth";
import { verifyYourEmail, youAlreadyHaveAnAccount, youSignInWithGoogle } from "@/lib/accountEmails";
import { signInMethodForEmail } from "@/lib/accountRepository";
import { countAll, signupCounts } from "@/lib/actionLimits";
import { clientIpAddress } from "@/lib/clientIpAddress";
import { sendEmail } from "@/lib/email";
import { newEmailToken } from "@/lib/emailToken";
import { hashPassword } from "@/lib/passwordHash";
import { newPasswordProblem, PASSWORD_MESSAGES } from "@/lib/passwordRules";
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
  const refusal = await countAll(signupCounts(email, await clientIpAddress()), realNow, () => newPasswordProblem(password, email));
  if (refusal === "overLimit") return checkYourEmail;
  if (refusal) return { kind: "form", errors: { password: PASSWORD_MESSAGES[refusal] } };

  const method = await signInMethodForEmail(email);
  if (method === "password") {
    await sendEmail(youAlreadyHaveAnAccount(email));
  } else if (method === "google") {
    await sendEmail(youSignInWithGoogle(email, "signup"));
  } else {
    const { token, tokenHash } = newEmailToken();
    await savePendingSignup({ email, name, passwordHash: await hashPassword(password), tokenHash }, realNow);
    await sendEmail(verifyYourEmail(email, name, token));
  }
  return checkYourEmail;
}
