"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { snapshotWeekOptions, SnapshotApprovalError } from "@/lib/analyticsSnapshots";
import { requireCurrentAdmin } from "@/lib/requireAdmin";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { studentSideClock } from "@/lib/studentClock";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { listWeeklySchedulesForStudent } from "@/lib/weeklyScheduleRepository";
import { currentWeekHadPracticeTest } from "@/lib/weeklyUpload";
import { prepareWeeklyUploadApproval } from "@/lib/weeklyUploadApproval";
import { approveWeeklyUpload } from "@/lib/weeklyUploadRepository";

export type WeeklyUploadConfirmResult = { error: string } | { signedOut: true };

const Parts = z.object({ analytics: z.unknown(), practiceTest: z.unknown() });
const Sample = z.object({ extraction: z.object({ source: z.literal("admin_sample") }) });

function usesSample(input: unknown) {
  const parts = Parts.safeParse(input);
  return parts.success && [parts.data.analytics, parts.data.practiceTest].some((part) => Sample.safeParse(part).success);
}

export async function confirmWeeklyUpload(input: unknown): Promise<WeeklyUploadConfirmResult> {
  const session = await auth();
  if (!session?.user) return { signedOut: true };

  const allowAdminSample = usesSample(input);
  if (allowAdminSample) {
    try { await requireCurrentAdmin(); }
    catch { return { error: "Admin access required for sample analytics." }; }
  }

  const student = await findStudentByAccountId(session.user.id);
  if (!student) redirect("/onboarding");

  const clock = await studentSideClock(session.user);
  const schedules = await listWeeklySchedulesForStudent(student.id);
  try {
    await approveWeeklyUpload(student.id, prepareWeeklyUploadApproval(input, clock.now, clock.real, {
      allowAdminSample,
      needsPracticeTest: currentWeekHadPracticeTest(schedules, clock.now, SCHEDULE_TIMEZONE),
      ...snapshotWeekOptions(clock),
    }));
  } catch (error) {
    if (error instanceof SnapshotApprovalError) return { error: error.message };
    throw error;
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
