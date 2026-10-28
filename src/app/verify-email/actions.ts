"use server";

import { redirect } from "next/navigation";
import { EMAIL_VERIFIED_PATH } from "@/lib/loginNotice";
import * as passwordAccount from "@/lib/passwordAccount";

export type VerifyEmailState = { linkDoesNotWork: boolean };

export async function verifyEmail(_state: VerifyEmailState, formData: FormData): Promise<VerifyEmailState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) return { linkDoesNotWork: true };
  const result = await passwordAccount.verifyEmail(token, new Date());
  if (result === "linkDoesNotWork") return { linkDoesNotWork: true };
  redirect(result === "verified" ? EMAIL_VERIFIED_PATH : "/login");
}
