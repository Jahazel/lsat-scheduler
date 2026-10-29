"use server";

import { signOut } from "@/auth";
import { afterSignOut } from "@/lib/requestPolicy";
import { answerAction } from "@/lib/securityLog";
import type { SignOutAnswer } from "@/lib/unexpectedFailure";

export async function logOut(): Promise<SignOutAnswer> {
  return answerAction("/", async () => {
    await signOut({ redirect: false });
    return { goTo: afterSignOut("/") };
  });
}
