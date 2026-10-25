"use server";

import { dateInScheduleTimezone } from "@/lib/adminTestWorkspace";
import { studentSideClock } from "@/lib/studentClock";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createStudent, findStudentByAccountId } from "@/lib/studentRepository";
import { SnapshotSaveLimitReached, snapshotWeekOptions, prepareApprovedSnapshot, summarizeApprovedRows, type SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import { parseOfficialAttempts, parseStudentProfile, type OfficialAttempt, type StudentProfileInput } from "@/lib/studentProfile";
import type { AnalyticsExtractedRow } from "@/lib/types";

export async function createStudentProfile(
  input: StudentProfileInput & {
    officialAttempts: OfficialAttempt[];
    analyticsRows: AnalyticsExtractedRow[];
    analyticsApproval: SnapshotApprovalMetadata | null;
  }
): Promise<{ error: string } | void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const { officialAttempts, analyticsRows, analyticsApproval, ...profile } = input;
  const clock = await studentSideClock(session.user);
  const today = dateInScheduleTimezone(clock.now);
  const studentFields = parseStudentProfile(profile, today);
  const attempts = parseOfficialAttempts(officialAttempts, today);

  const existing = await findStudentByAccountId(session.user.id);
  if (existing) {
    redirect("/dashboard");
  }

  const approvedSnapshot =
    analyticsRows.length > 0 && analyticsApproval
      ? prepareApprovedSnapshot({ ...summarizeApprovedRows(analyticsRows), ...analyticsApproval }, clock.now, clock.real, snapshotWeekOptions(clock))
      : null;
  let student;
  try {
    student = await createStudent(session.user.id, studentFields, {
      snapshot: approvedSnapshot && { values: approvedSnapshot, realNow: clock.real },
      officialAttempts: attempts,
    });
  } catch (error) {
    if (error instanceof SnapshotSaveLimitReached) return { error: error.message };
    throw error;
  }
  if (!student) redirect("/dashboard");

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
