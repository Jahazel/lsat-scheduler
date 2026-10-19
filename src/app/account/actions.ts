"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { eq } from "drizzle-orm";
import { getPostgresDatabase } from "@/lib/postgres";
import { accounts } from "@/lib/postgresSchema";
import { isAccountId } from "@/lib/accountRepository";
import { updateStudentByAccountId } from "@/lib/studentRepository";
import { studentSideToday } from "@/lib/studentClock";
import { parseStudentProfile, type StudentProfileInput } from "@/lib/studentProfile";
import { ADMIN_RESTRICTED_ACTION_MESSAGE, isAdminUser } from "@/lib/accessControl";

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

export async function deleteAccount(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (isAdminUser(session.user)) {
    throw new Error(ADMIN_RESTRICTED_ACTION_MESSAGE);
  }
  if (formData.get("confirmation") !== "DELETE") {
    throw new Error("Type DELETE to confirm account deletion.");
  }

  if (!isAccountId(session.user.id)) throw new Error("Account record not found");
  await getPostgresDatabase().delete(accounts).where(eq(accounts.id, session.user.id));
  await signOut({ redirectTo: "/" });
}
