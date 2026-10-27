"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { eq } from "drizzle-orm";
import { getPostgresDatabase } from "@/lib/postgres";
import { accounts } from "@/lib/postgresSchema";
import {
  changePassword as saveNewPassword, deletePasswordAccount, endAllSessions, findPasswordAccountById, isAccountId,
} from "@/lib/accountRepository";
import { updateStudentByAccountId } from "@/lib/studentRepository";
import { studentSideToday } from "@/lib/studentClock";
import { parseStudentProfile, type StudentProfileInput } from "@/lib/studentProfile";
import { ADMIN_RESTRICTED_ACTION_MESSAGE, isAdminUser } from "@/lib/accessControl";
import { signedInRecently } from "@/lib/accountSession";
import { proveCurrentPassword } from "@/lib/currentPassword";
import { PASSWORD_CHANGED_PATH } from "@/lib/loginNotice";
import { hashPassword } from "@/lib/passwordHash";
import { CURRENT_PASSWORD_MESSAGES } from "@/lib/currentPasswordMessages";
import { newPasswordProblem, PASSWORD_MESSAGES } from "@/lib/passwordRules";

export async function updateStudentProfile(input: StudentProfileInput) {
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
}

export type DeletionRefusal = "sign-in-too-old" | "wrong-text" | "wrong-password" | "paused" | null;

export async function deleteAccount(_previous: DeletionRefusal, formData: FormData): Promise<DeletionRefusal> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (isAdminUser(session.user)) {
    throw new Error(ADMIN_RESTRICTED_ACTION_MESSAGE);
  }
  if (!isAccountId(session.user.id)) throw new Error("Account record not found");
  const passwordAccount = await findPasswordAccountById(session.user.id);
  if (!passwordAccount && !signedInRecently(session.signedInAt)) return "sign-in-too-old";
  if (formData.get("confirmation") !== "DELETE") return "wrong-text";
  if (passwordAccount) {
    const check = await proveCurrentPassword(passwordAccount, formData.get("currentPassword"));
    if (check.kind !== "proven") return check.kind === "wrong" ? "wrong-password" : "paused";
    if (!(await deletePasswordAccount(check.proof))) return "wrong-password";
  } else {
    await getPostgresDatabase().delete(accounts).where(eq(accounts.id, session.user.id));
  }
  await signOut({ redirectTo: "/" });
  return null;
}

export type PasswordChangeRefusal = { field: "currentPassword" | "newPassword"; message: string } | null;

export async function changePassword(_previous: PasswordChangeRefusal, formData: FormData): Promise<PasswordChangeRefusal> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (!isAccountId(session.user.id)) throw new Error("Account record not found");
  const account = await findPasswordAccountById(session.user.id);
  if (!account) throw new Error("This Account signs in with Google and has no password.");

  const check = await proveCurrentPassword(account, formData.get("currentPassword"));
  if (check.kind !== "proven") return { field: "currentPassword", message: CURRENT_PASSWORD_MESSAGES[check.kind] };
  const typed = formData.get("newPassword");
  const newPassword = typeof typed === "string" ? typed : "";
  const problem = newPasswordProblem(newPassword, account.email);
  if (problem) return { field: "newPassword", message: PASSWORD_MESSAGES[problem] };

  if (!(await saveNewPassword(check.proof, await hashPassword(newPassword)))) {
    return { field: "currentPassword", message: CURRENT_PASSWORD_MESSAGES.wrong };
  }
  await signOut({ redirectTo: PASSWORD_CHANGED_PATH });
  return null;
}

export async function signInAgainToDelete() {
  await signIn("google", { redirectTo: "/account#delete-account" }, { prompt: "select_account" });
}

export async function signOutAllDevices() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (!isAccountId(session.user.id)) throw new Error("Account record not found");
  await endAllSessions(session.user.id);
  await signOut({ redirectTo: "/login" });
}
