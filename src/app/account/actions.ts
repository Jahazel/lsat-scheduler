"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { eq } from "drizzle-orm";
import { getPostgresDatabase } from "@/lib/postgres";
import { accounts } from "@/lib/postgresSchema";
import { isAccountId, endAllSessions } from "@/lib/accountRepository";
import { updateStudentByAccountId } from "@/lib/studentRepository";
import { studentSideToday } from "@/lib/studentClock";
import { parseStudentProfile, type StudentProfileInput } from "@/lib/studentProfile";
import { ADMIN_RESTRICTED_ACTION_MESSAGE, isAdminUser } from "@/lib/accessControl";
import { signedInRecently } from "@/lib/accountSession";

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

export type DeletionRefusal = "sign-in-too-old" | "wrong-text" | null;

export async function deleteAccount(_previous: DeletionRefusal, formData: FormData): Promise<DeletionRefusal> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (isAdminUser(session.user)) {
    throw new Error(ADMIN_RESTRICTED_ACTION_MESSAGE);
  }
  if (!signedInRecently(session.signedInAt)) return "sign-in-too-old";
  if (formData.get("confirmation") !== "DELETE") return "wrong-text";

  if (!isAccountId(session.user.id)) throw new Error("Account record not found");
  await getPostgresDatabase().delete(accounts).where(eq(accounts.id, session.user.id));
  await signOut({ redirectTo: "/" });
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
