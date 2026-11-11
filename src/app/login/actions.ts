"use server";

import { redirect } from "next/navigation";
import { LoginRefused, signIn } from "@/auth";
import { isSignInRefusal, loginRefusalPath, PASSWORD_LOGIN_NOTICES, type LoginNotice } from "@/lib/loginNotice";
import { PASSWORD_MESSAGES } from "@/lib/passwordRules";
import { answerAction } from "@/lib/securityLog";
import type { Answer, FormState } from "@/lib/unexpectedFailure";

export type LoginState = { notice: LoginNotice | null; passwordError: string | null };

export async function signInWithGoogle(): Promise<FormState> {
  return answerAction("/login", async () => {
    await signIn("google", { redirectTo: "/login" });
    return null;
  });
}

export async function logInWithPassword(_state: Answer<LoginState> | null, formData: FormData): Promise<Answer<LoginState>> {
  return answerAction("/login", async () => {
    try {
      await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/dashboard" });
    } catch (error) {
      if (!(error instanceof LoginRefused)) throw error;
      if (isSignInRefusal(error.code)) redirect(loginRefusalPath(error.code));
      if (error.code === "tooLong") return { notice: null, passwordError: PASSWORD_MESSAGES.tooLong };
      return { notice: PASSWORD_LOGIN_NOTICES[error.code], passwordError: null };
    }
    throw new Error("A password login that succeeds always redirects.");
  });
}
