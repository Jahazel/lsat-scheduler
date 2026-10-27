"use server";

import { redirect } from "next/navigation";
import { hashEmailToken } from "@/lib/emailToken";
import { EMAIL_VERIFIED_PATH } from "@/lib/loginNotice";
import { createAccountFromPendingSignup } from "@/lib/pendingSignupRepository";

export type VerifyEmailState = { linkDoesNotWork: boolean };

export async function verifyEmail(_state: VerifyEmailState, formData: FormData): Promise<VerifyEmailState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) return { linkDoesNotWork: true };
  const result = await createAccountFromPendingSignup(hashEmailToken(token), new Date());
  if (result === "linkDoesNotWork") return { linkDoesNotWork: true };
  redirect(result === "verified" ? EMAIL_VERIFIED_PATH : "/login");
}
