"use server";

import { redirect } from "next/navigation";
import { hashEmailToken } from "@/lib/emailToken";
import { PASSWORD_CHANGED_PATH } from "@/lib/loginNotice";
import { hashPassword } from "@/lib/passwordHash";
import { findResetLinkEmail, setPasswordWithResetLink } from "@/lib/passwordResetRepository";
import { newPasswordProblem, PASSWORD_MESSAGES } from "@/lib/passwordRules";

export type ResetPasswordState = { kind: "form"; error?: string } | { kind: "linkDoesNotWork" };

export async function resetPassword(_state: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const token = formData.get("token");
  const password = formData.get("password");
  if (typeof token !== "string" || !token || typeof password !== "string") return { kind: "linkDoesNotWork" };
  const tokenHash = hashEmailToken(token);

  const email = await findResetLinkEmail(tokenHash, new Date());
  if (!email) return { kind: "linkDoesNotWork" };
  const problem = newPasswordProblem(password, email);
  if (problem) return { kind: "form", error: PASSWORD_MESSAGES[problem] };

  if (!(await setPasswordWithResetLink(tokenHash, await hashPassword(password), new Date()))) return { kind: "linkDoesNotWork" };
  redirect(PASSWORD_CHANGED_PATH);
}
