"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { studentSideToday } from "@/lib/studentClock";
import { parseStudySettings, type StudySettingsInput } from "@/lib/studentProfile";
import { findStudentByAccountId, updateStudySettings } from "@/lib/studentRepository";
import { answerAction } from "@/lib/securityLog";
import type { FormState } from "@/lib/unexpectedFailure";

export async function saveStudySettings(input: StudySettingsInput): Promise<FormState> {
  return answerAction("/settings", async () => {
    const session = await auth();
    if (!session?.user) throw new Error("Not authenticated");

    const stored = await findStudentByAccountId(session.user.id);
    if (!stored) redirect("/onboarding");

    const settings = parseStudySettings(input, stored.currentScore, await studentSideToday(session.user));
    if (!(await updateStudySettings(session.user.id, settings))) {
      throw new Error("Study settings were not saved: the student is gone or the goal is no longer above the current score.");
    }

    revalidatePath("/", "layout");
    return null;
  });
}
