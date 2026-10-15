"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { createAccount } from "@/lib/accountRepository";
import { signIn } from "@/auth";

const SignupSchema = z.object({
  name: z.string().min(2, { error: "Name must be at least 2 characters." }).trim(),
  email: z.email({ error: "Enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Password must contain at least one letter." })
    .regex(/[0-9]/, { error: "Password must contain at least one number." }),
});

export interface SignupState {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string;
}

export async function signup(_state: SignupState, formData: FormData): Promise<SignupState> {
  if (formData.get("agreedToTerms") !== "on") {
    return { message: "You must agree to the Terms and Privacy Policy to continue." };
  }

  const validated = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const { name, email, password } = validated.data;

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await createAccount({ name, email, passwordHash, role: "student" });
  if (!account) {
    return { message: "An account with that email already exists." };
  }

  await signIn("credentials", { email, password, redirectTo: "/onboarding" });
  return {};
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/onboarding" });
}
