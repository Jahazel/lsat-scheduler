"use server";

import { signOut } from "@/auth";
import { answerAction } from "@/lib/securityLog";
import type { FormState } from "@/lib/unexpectedFailure";

export async function logOut(): Promise<FormState> {
  return answerAction("/", async () => {
    await signOut({ redirectTo: "/" });
    return null;
  });
}
