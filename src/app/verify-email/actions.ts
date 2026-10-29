"use server";

import { redirect } from "next/navigation";
import { passwordRequest } from "@/lib/clientIpAddress";
import { EMAIL_VERIFIED_PATH } from "@/lib/loginNotice";
import * as passwordAccount from "@/lib/passwordAccount";
import { answerAction } from "@/lib/securityLog";
import type { Answer } from "@/lib/unexpectedFailure";

export type VerifyEmailState = { linkDoesNotWork: boolean };

export async function verifyEmail(_state: Answer<VerifyEmailState>, formData: FormData): Promise<Answer<VerifyEmailState>> {
  return answerAction("/verify-email", async () => {
    const token = formData.get("token");
    if (typeof token !== "string" || !token) return { linkDoesNotWork: true };
    const result = await passwordAccount.verifyEmail(token, await passwordRequest("/verify-email"));
    if (result === "linkDoesNotWork") return { linkDoesNotWork: true };
    redirect(result === "verified" ? EMAIL_VERIFIED_PATH : "/login");
  });
}
