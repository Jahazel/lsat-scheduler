"use server";

import { signIn } from "@/auth";

export interface SignupState {
  error?: string;
}

export async function signUpWithGoogle(_state: SignupState, formData: FormData): Promise<SignupState> {
  if (formData.get("agreedToTerms") !== "on") return { error: "Tick the box to continue." };
  await signIn("google", { redirectTo: "/onboarding" });
  return {};
}
