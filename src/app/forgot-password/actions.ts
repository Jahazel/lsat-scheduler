"use server";

import { z } from "zod";
import { passwordRequest } from "@/lib/clientIpAddress";
import * as passwordAccount from "@/lib/passwordAccount";
import { answerAction } from "@/lib/securityLog";
import type { Answer } from "@/lib/unexpectedFailure";

export type ForgotPasswordState = { kind: "form"; error?: string } | { kind: "sent"; email: string };

const ForgotPasswordFields = z.object({ email: passwordAccount.EmailField });

export async function requestPasswordReset(_state: Answer<ForgotPasswordState>, formData: FormData): Promise<Answer<ForgotPasswordState>> {
  return answerAction("/forgot-password", async () => {
    const parsed = ForgotPasswordFields.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { kind: "form", error: "Enter a valid email." };
    const { email } = parsed.data;
    await passwordAccount.requestPasswordReset(email, await passwordRequest("/forgot-password"));
    return { kind: "sent", email };
  });
}
