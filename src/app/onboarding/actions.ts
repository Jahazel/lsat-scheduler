"use server";

import { studentSideClock } from "@/lib/studentClock";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createStudent, findStudentByAccountId } from "@/lib/studentRepository";
import { summarizeAnalyticsRows } from "@/lib/analytics";
import { snapshotWeekOptions, prepareApprovedSnapshot, type SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import { studentProfileSchema } from "@/lib/studentProfile";
import type { AnalyticsExtractedRow, Student } from "@/lib/types";

export async function createStudentProfile(
  input: Student & { analyticsRows: AnalyticsExtractedRow[]; analyticsApproval: SnapshotApprovalMetadata | null }
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const { analyticsRows, analyticsApproval, ...profile } = input;
  const studentFields = studentProfileSchema.parse(profile);

  const existing = await findStudentByAccountId(session.user.id);
  if (existing) {
    redirect("/dashboard");
  }

  const clock = await studentSideClock(session.user);
  const approvedSnapshot =
    analyticsRows.length > 0 && analyticsApproval
      ? prepareApprovedSnapshot({ ...summarizeAnalyticsRows(analyticsRows), ...analyticsApproval }, clock.now, clock.real, snapshotWeekOptions(clock))
      : null;
  const student = await createStudent(session.user.id, studentFields, approvedSnapshot);
  if (!student) redirect("/dashboard");

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
