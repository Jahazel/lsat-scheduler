"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SnapshotApprovalError } from "@/lib/analyticsSnapshots";
import { requireCurrentAdmin } from "@/lib/requireAdmin";
import { readScanningOff } from "@/lib/scanSpending";
import { studentSideClock } from "@/lib/studentClock";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { listWeeklySchedulesForStudent } from "@/lib/weeklyScheduleRepository";
import { prepareWeeklyUpload, usesAdminSample } from "@/lib/weeklyUpload";
import { approveWeeklyUpload } from "@/lib/weeklyUploadRepository";

export type WeeklyUploadConfirmResult = { error: string } | { signedOut: true };

export async function confirmWeeklyUpload(input: unknown): Promise<WeeklyUploadConfirmResult> {
  const session = await auth();
  if (!session?.user?.id) return { signedOut: true };

  const allowAdminSample = usesAdminSample(input);
  if (allowAdminSample) {
    try { await requireCurrentAdmin(); }
    catch { return { error: "Admin access required for sample analytics." }; }
  }

  const student = await findStudentByAccountId(session.user.id);
  if (!student) redirect("/onboarding");

  const clock = await studentSideClock(session.user);
  const [schedules, scanningOff] = await Promise.all([listWeeklySchedulesForStudent(student.id), readScanningOff(clock.real)]);
  try {
    await approveWeeklyUpload(
      student.id,
      prepareWeeklyUpload(input, { clock, schedules, allowAdminSample, scanningOff }),
      { accountId: session.user.id, realNow: clock.real },
    );
  } catch (error) {
    if (error instanceof SnapshotApprovalError) return { error: error.message };
    throw error;
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
