"use server";

import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { endAllSessions, isAccountId } from "@/lib/accountRepository";
import { ADMIN_RESTRICTED_ACTION_MESSAGE, isAdminUser } from "@/lib/accessControl";
import { openCustomerPortalSession, type PortalReturn } from "@/lib/billingRepository";
import { passwordRequest } from "@/lib/clientIpAddress";
import { loginRefusalPath, PASSWORD_CHANGED_PATH } from "@/lib/loginNotice";
import { CURRENT_PASSWORD_MESSAGES } from "@/lib/currentPasswordMessages";
import * as passwordAccount from "@/lib/passwordAccount";
import { PASSWORD_MESSAGES } from "@/lib/passwordRules";
import { afterSignOut, type SignedOut, type SignOutAnswer } from "@/lib/requestPolicy";
import { answerAction, recordSecurityEvent } from "@/lib/securityLog";
import type { Answer, FormState } from "@/lib/unexpectedFailure";

export type DeletionRefusal = passwordAccount.DeletionRefusal | null;

export async function deleteAccount(_previous: Answer<DeletionRefusal>, formData: FormData): Promise<Answer<DeletionRefusal | SignedOut>> {
  return answerAction("/account", async () => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Not authenticated");
    }
    if (isAdminUser(session.user)) {
      throw new Error(ADMIN_RESTRICTED_ACTION_MESSAGE);
    }
    if (!isAccountId(session.user.id)) throw new Error("Account record not found");
    const result = await passwordAccount.deleteAccount(
      session.user.id,
      { confirmation: formData.get("confirmation"), currentPassword: formData.get("currentPassword"), signedInAt: session.signedInAt },
      await passwordRequest("/account"),
    );
    if (result !== "deleted" && result !== "willFinish") return result;
    await signOut({ redirect: false });
    return { goTo: afterSignOut(result === "deleted" ? "/" : loginRefusalPath("deletionWillFinish")) };
  });
}

export type PasswordChangeRefusal = { field: "currentPassword" | "newPassword"; message: string } | null;

export async function changePassword(_previous: Answer<PasswordChangeRefusal>, formData: FormData): Promise<Answer<PasswordChangeRefusal | SignedOut>> {
  return answerAction("/account", async () => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Not authenticated");
    }
    if (!isAccountId(session.user.id)) throw new Error("Account record not found");

    const result = await passwordAccount.changePassword(
      session.user.id,
      { currentPassword: formData.get("currentPassword"), newPassword: formData.get("newPassword") },
      await passwordRequest("/account"),
    );
    if (result === "noPassword") throw new Error("This Account signs in with Google and has no password.");
    if (result === "wrong-password" || result === "paused") return { field: "currentPassword", message: CURRENT_PASSWORD_MESSAGES[result] };
    if (result !== "changed") return { field: "newPassword", message: PASSWORD_MESSAGES[result] };
    await signOut({ redirect: false });
    return { goTo: afterSignOut(PASSWORD_CHANGED_PATH) };
  });
}

export async function signInAgainToDelete(): Promise<FormState> {
  return answerAction("/account", async () => {
    await signIn("google", { redirectTo: "/account#delete-account" }, { prompt: "select_account" });
    return null;
  });
}

export async function signOutAllDevices(): Promise<SignOutAnswer> {
  return answerAction("/account", async () => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Not authenticated");
    }
    if (!isAccountId(session.user.id)) throw new Error("Account record not found");
    await endAllSessions(session.user.id);
    await recordSecurityEvent({ event: "sign_out_all_devices", result: "done", route: "/account", who: { account: session.user.id } });
    await signOut({ redirect: false });
    return { goTo: afterSignOut("/login") };
  });
}

export async function openCustomerPortal(): Promise<FormState> {
  return answerAction("/account", () => sendToCustomerPortal("account"));
}

export async function openCustomerPortalFromThisWeek(): Promise<FormState> {
  return answerAction("/dashboard", () => sendToCustomerPortal("this_week"));
}

async function sendToCustomerPortal(from: PortalReturn): Promise<never> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (isAdminUser(session.user)) {
    throw new Error(ADMIN_RESTRICTED_ACTION_MESSAGE);
  }
  const url = await openCustomerPortalSession(session.user.id, from);
  if (!url) throw new Error("This Account has no plan to manage.");
  redirect(url);
}
