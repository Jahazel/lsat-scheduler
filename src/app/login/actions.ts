"use server";

import { redirect } from "next/navigation";
import { LoginRefused, signIn } from "@/auth";
import { DELETING_SIGN_IN_PATHS, DISABLED_SIGN_IN_PATH, PASSWORD_LOGIN_NOTICES, type LoginNotice } from "@/lib/loginNotice";
import { PASSWORD_MESSAGES } from "@/lib/passwordRules";
import { answerAction } from "@/lib/securityLog";
import type { Answer, FormState } from "@/lib/unexpectedFailure";

export type LoginState = { email: string; notice: LoginNotice | null; passwordError: string | null };

export async function signInWithGoogle(): Promise<FormState> {
  return answerAction("/login", async () => {
    await signIn("google", { redirectTo: "/login" });
    return null;
  });
}

export async function logInWithPassword(_state: Answer<LoginState> | null, formData: FormData): Promise<Answer<LoginState>> {
  return answerAction("/login", async () => {
    const email = formData.get("email");
    try {
      await signIn("credentials", { email, password: formData.get("password"), redirectTo: "/login" });
    } catch (error) {
      if (!(error instanceof LoginRefused)) throw error;
      if (error.code === "accountDisabled") redirect(DISABLED_SIGN_IN_PATH);
      if (error.code === "accountDeleted" || error.code === "deletionWillFinish") redirect(DELETING_SIGN_IN_PATHS[error.code]);
      const typedEmail = typeof email === "string" ? email : "";
      if (error.code === "tooLong") return { email: typedEmail, notice: null, passwordError: PASSWORD_MESSAGES.tooLong };
      return { email: typedEmail, notice: PASSWORD_LOGIN_NOTICES[error.code], passwordError: null };
    }
    throw new Error("A password login that succeeds always redirects.");
  });
}
