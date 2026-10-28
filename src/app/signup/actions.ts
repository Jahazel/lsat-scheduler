"use server";

import { z } from "zod";
import { signIn } from "@/auth";
import { passwordRequest } from "@/lib/clientIpAddress";
import { EmailField, signUp } from "@/lib/passwordAccount";
import { PASSWORD_MESSAGES } from "@/lib/passwordRules";

export type SignupState =
  | { kind: "form"; errors: { name?: string; email?: string; password?: string; terms?: string } }
  | { kind: "checkYourEmail"; email: string };

const SignupFields = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(200, "Use a shorter name."),
  email: EmailField,
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
  const result = await signUp(parsed.data, await passwordRequest("/signup"));
  if (result !== "checkYourEmail") return { kind: "form", errors: { password: PASSWORD_MESSAGES[result] } };
  return { kind: "checkYourEmail", email: parsed.data.email };
}
