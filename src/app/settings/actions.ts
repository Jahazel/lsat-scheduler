"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { studentSideToday } from "@/lib/studentClock";
import { goalScoreError, parseStudySettings, type StudySettingsInput } from "@/lib/studentProfile";
import { findStudentByAccountId, updateStudySettings } from "@/lib/studentRepository";
import { answerAction } from "@/lib/securityLog";
import type { FormState } from "@/lib/unexpectedFailure";

/** The weekly upload can raise the current score while Study settings is open, so the goal the form checked may no longer be above it. */
export type StudySettingsAnswer = FormState | { refused: "goalScore"; currentScore: number };

export async function saveStudySettings(input: StudySettingsInput): Promise<StudySettingsAnswer> {
  return answerAction("/settings", async () => {
    const session = await auth();
    if (!session?.user) throw new Error("Not authenticated");

    const stored = await findStudentByAccountId(session.user.id);
    if (!stored) redirect("/onboarding");
    if (goalScoreError(stored.currentScore, input.goalScore)) {
      return { refused: "goalScore", currentScore: stored.currentScore };
    }

    const { settings, officialAttempts } = parseStudySettings(input, stored.currentScore, await studentSideToday(session.user));
    if (!(await updateStudySettings(session.user.id, settings, officialAttempts))) {
      throw new Error("Study settings were not saved: the student is gone or the goal is no longer above the current score.");
    }

    revalidatePath("/", "layout");
    return null;
  });
}
