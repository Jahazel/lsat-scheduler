"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { DISABLED_SIGN_IN_PATH, PASSWORD_LOGIN_NOTICES, type LoginNotice } from "@/lib/loginNotice";
import { PASSWORD_MESSAGES } from "@/lib/passwordRules";
import { LoginRefused } from "@/lib/passwordSignIn";

export type LoginState = { email: string; notice: LoginNotice | null; passwordError: string | null };

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/login" });
}

export async function logInWithPassword(_state: LoginState | null, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  try {
    await signIn("credentials", { email, password: formData.get("password"), redirectTo: "/login" });
  } catch (error) {
    if (!(error instanceof LoginRefused)) throw error;
    if (error.code === "accountDisabled") redirect(DISABLED_SIGN_IN_PATH);
    const typedEmail = typeof email === "string" ? email : "";
    if (error.code === "tooLong") return { email: typedEmail, notice: null, passwordError: PASSWORD_MESSAGES.tooLong };
    return { email: typedEmail, notice: PASSWORD_LOGIN_NOTICES[error.code], passwordError: null };
  }
  throw new Error("A password login that succeeds always redirects.");
}
