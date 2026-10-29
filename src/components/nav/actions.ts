"use server";

import { signOut } from "@/auth";
import { afterSignOut, type SignOutAnswer } from "@/lib/requestPolicy";
import { answerAction } from "@/lib/securityLog";

export async function logOut(): Promise<SignOutAnswer> {
  return answerAction("/", async () => {
    await signOut({ redirect: false });
    return { goTo: afterSignOut("/") };
  });
}
