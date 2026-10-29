"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { endAllSessions, isAccountId } from "@/lib/accountRepository";
import { updateStudentByAccountId } from "@/lib/studentRepository";
import { studentSideToday } from "@/lib/studentClock";
import { parseStudentProfile, type StudentProfileInput } from "@/lib/studentProfile";
import { ADMIN_RESTRICTED_ACTION_MESSAGE, isAdminUser } from "@/lib/accessControl";
import { passwordRequest } from "@/lib/clientIpAddress";
import { DELETING_SIGN_IN_PATHS, PASSWORD_CHANGED_PATH } from "@/lib/loginNotice";
import { CURRENT_PASSWORD_MESSAGES } from "@/lib/currentPasswordMessages";
import * as passwordAccount from "@/lib/passwordAccount";
import { PASSWORD_MESSAGES } from "@/lib/passwordRules";
import { answerAction, recordSecurityEvent } from "@/lib/securityLog";
import type { Answer, FormState } from "@/lib/unexpectedFailure";

export async function updateStudentProfile(input: StudentProfileInput) {
  return answerAction("/settings", async () => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Not authenticated");
    }

    const studentFields = parseStudentProfile(input, await studentSideToday(session.user));

    const updated = await updateStudentByAccountId(session.user.id, studentFields);

    if (!updated) {
      redirect("/onboarding");
    }

    if (isAdminUser(session.user)) revalidatePath("/", "layout");
    redirect("/dashboard");
  });
}

export type DeletionRefusal = passwordAccount.DeletionRefusal | null;

export async function deleteAccount(_previous: Answer<DeletionRefusal>, formData: FormData): Promise<Answer<DeletionRefusal>> {
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
    await signOut({ redirectTo: result === "deleted" ? "/" : DELETING_SIGN_IN_PATHS.deletionWillFinish });
    return null;
  });
}

export type PasswordChangeRefusal = { field: "currentPassword" | "newPassword"; message: string } | null;

export async function changePassword(_previous: Answer<PasswordChangeRefusal>, formData: FormData): Promise<Answer<PasswordChangeRefusal>> {
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
    await signOut({ redirectTo: PASSWORD_CHANGED_PATH });
    return null;
  });
}

export async function signInAgainToDelete(): Promise<FormState> {
  return answerAction("/account", async () => {
    await signIn("google", { redirectTo: "/account#delete-account" }, { prompt: "select_account" });
    return null;
  });
}

export async function signOutAllDevices(): Promise<FormState> {
  return answerAction("/account", async () => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Not authenticated");
    }
    if (!isAccountId(session.user.id)) throw new Error("Account record not found");
    await endAllSessions(session.user.id);
    await recordSecurityEvent({ event: "sign_out_all_devices", result: "done", route: "/account", who: { account: session.user.id } });
    await signOut({ redirectTo: "/login" });
    return null;
  });
}
