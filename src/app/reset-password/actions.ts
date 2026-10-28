"use server";

import { redirect } from "next/navigation";
import { PASSWORD_CHANGED_PATH } from "@/lib/loginNotice";
import * as passwordAccount from "@/lib/passwordAccount";
import { PASSWORD_MESSAGES } from "@/lib/passwordRules";

export type ResetPasswordState = { kind: "form"; error?: string } | { kind: "linkDoesNotWork" };

export async function resetPassword(_state: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const token = formData.get("token");
  const password = formData.get("password");
  if (typeof token !== "string" || !token || typeof password !== "string") return { kind: "linkDoesNotWork" };

  const result = await passwordAccount.resetPassword(token, password, () => new Date());
  if (result === "linkDoesNotWork") return { kind: "linkDoesNotWork" };
  if (result !== "changed") return { kind: "form", error: PASSWORD_MESSAGES[result] };
  redirect(PASSWORD_CHANGED_PATH);
}
