"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { countAction } from "@/lib/actionLimits";
import { SNAPSHOT_SAVE_LIMIT_MESSAGE, snapshotWeekOptions, SnapshotApprovalError } from "@/lib/analyticsSnapshots";
import { requireCurrentAdmin } from "@/lib/requireAdmin";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { studentSideClock } from "@/lib/studentClock";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { listWeeklySchedulesForStudent } from "@/lib/weeklyScheduleRepository";
import { currentWeekInTimezone, uploadWeekOf, weeklyUploadIsOpen } from "@/lib/currentWeeklySchedule";
import { isoDateInWeek } from "@/lib/scheduleReasonText";
import { weekHadPracticeTest } from "@/lib/weeklyUpload";
import { prepareWeeklyUploadApproval } from "@/lib/weeklyUploadApproval";
import { approveWeeklyUpload } from "@/lib/weeklyUploadRepository";

export type WeeklyUploadConfirmResult = { error: string } | { signedOut: true };

const Parts = z.object({ analytics: z.unknown(), practiceTest: z.unknown() });
const TargetWeek = z.object({ weekOf: z.iso.date() });
const Sample = z.object({ extraction: z.object({ source: z.literal("admin_sample") }) });

function usesSample(input: unknown) {
  const parts = Parts.safeParse(input);
  return parts.success && [parts.data.analytics, parts.data.practiceTest].some((part) => Sample.safeParse(part).success);
}

export async function confirmWeeklyUpload(input: unknown): Promise<WeeklyUploadConfirmResult> {
  const session = await auth();
  if (!session?.user?.id) return { signedOut: true };

  const allowAdminSample = usesSample(input);
  if (allowAdminSample) {
    try { await requireCurrentAdmin(); }
    catch { return { error: "Admin access required for sample analytics." }; }
  }

  const student = await findStudentByAccountId(session.user.id);
  if (!student) redirect("/onboarding");

  const clock = await studentSideClock(session.user);
  const target = TargetWeek.safeParse(input);
  const schedules = await listWeeklySchedulesForStudent(student.id);
  const currentWeek = currentWeekInTimezone(clock.now, SCHEDULE_TIMEZONE);
  if (
    !target.success || target.data.weekOf !== uploadWeekOf(clock.now, SCHEDULE_TIMEZONE)
    || !weeklyUploadIsOpen(clock.now, SCHEDULE_TIMEZONE, schedules.some((record) => record.weekStartDate === currentWeek))
  ) {
    return { error: "This page is out of date. Open This week to continue." };
  }
  let upload;
  try {
    upload = prepareWeeklyUploadApproval(input, clock.now, clock.real, {
      allowAdminSample,
      needsPracticeTest: weekHadPracticeTest(schedules, isoDateInWeek(target.data.weekOf, -7)),
      ...snapshotWeekOptions(clock),
    });
  } catch (error) {
    if (error instanceof SnapshotApprovalError) return { error: error.message };
    throw error;
  }
  if (!(await countAction("analyticsSnapshotSave", session.user.id, clock.real)).allowed) {
    return { error: SNAPSHOT_SAVE_LIMIT_MESSAGE };
  }
  await approveWeeklyUpload(student.id, upload);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
