"use server";

import { redirect } from "next/navigation";
import { PASSWORD_CHANGED_PATH } from "@/lib/loginNotice";
import * as passwordAccount from "@/lib/passwordAccount";
import { PASSWORD_MESSAGES } from "@/lib/passwordRules";
import { answerAction } from "@/lib/securityLog";
import type { Answer } from "@/lib/unexpectedFailure";

export type ResetPasswordState = { kind: "form"; error?: string } | { kind: "linkDoesNotWork" };

export async function resetPassword(_state: Answer<ResetPasswordState>, formData: FormData): Promise<Answer<ResetPasswordState>> {
  return answerAction("/reset-password", async () => {
    const token = formData.get("token");
    const password = formData.get("password");
    if (typeof token !== "string" || !token || typeof password !== "string") return { kind: "linkDoesNotWork" };

    const result = await passwordAccount.resetPassword(token, password, "/reset-password", () => new Date());
    if (result === "linkDoesNotWork") return { kind: "linkDoesNotWork" };
    if (result !== "changed") return { kind: "form", error: PASSWORD_MESSAGES[result] };
    redirect(PASSWORD_CHANGED_PATH);
  });
}
