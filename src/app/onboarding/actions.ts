"use server";

import { dateInScheduleTimezone } from "@/lib/adminTestWorkspace";
import { studentSideClock } from "@/lib/studentClock";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createStudent, findStudentByAccountId } from "@/lib/studentRepository";
import { summarizeAnalyticsRows } from "@/lib/analytics";
import { countAction } from "@/lib/actionLimits";
import { SNAPSHOT_SAVE_LIMIT_MESSAGE, snapshotWeekOptions, prepareApprovedSnapshot, type SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
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
      ? prepareApprovedSnapshot({ ...summarizeAnalyticsRows(analyticsRows), ...analyticsApproval }, clock.now, clock.real, snapshotWeekOptions(clock))
      : null;
  if (approvedSnapshot && !(await countAction("analyticsSnapshotSave", session.user.id, clock.real)).allowed) {
    return { error: SNAPSHOT_SAVE_LIMIT_MESSAGE };
  }
  const student = await createStudent(session.user.id, studentFields, { snapshot: approvedSnapshot, officialAttempts: attempts });
  if (!student) redirect("/dashboard");

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
