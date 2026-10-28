"use server";

import { z } from "zod";
import { passwordRequest } from "@/lib/clientIpAddress";
import * as passwordAccount from "@/lib/passwordAccount";

export type ForgotPasswordState = { kind: "form"; error?: string } | { kind: "sent"; email: string };

const ForgotPasswordFields = z.object({ email: passwordAccount.EmailField });

export async function requestPasswordReset(_state: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const parsed = ForgotPasswordFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { kind: "form", error: "Enter a valid email." };
  const { email } = parsed.data;
  await passwordAccount.requestPasswordReset(email, await passwordRequest("/forgot-password"));
  return { kind: "sent", email };
}
