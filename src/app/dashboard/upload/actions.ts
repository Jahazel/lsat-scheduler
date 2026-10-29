"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SnapshotApprovalError, SnapshotSaveLimitReached } from "@/lib/analyticsSnapshots";
import { AdminAccessRequired, requireCurrentAdmin } from "@/lib/requireAdmin";
import { answerAction, recordSecurityEvent } from "@/lib/securityLog";
import { readScanningOff } from "@/lib/scanSpending";
import { studentSideClock } from "@/lib/studentClock";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { listWeeklySchedulesForStudent } from "@/lib/weeklyScheduleRepository";
import { prepareWeeklyUpload, usesAdminSample } from "@/lib/weeklyUpload";
import { approveWeeklyUpload } from "@/lib/weeklyUploadRepository";
import type { Answer } from "@/lib/unexpectedFailure";

export type WeeklyUploadConfirmResult = { error: string } | { signedOut: true };

export async function confirmWeeklyUpload(input: unknown): Promise<Answer<WeeklyUploadConfirmResult>> {
  return answerAction("/dashboard/upload", async () => {
    const session = await auth();
    if (!session?.user?.id) return { signedOut: true };

    const allowAdminSample = usesAdminSample(input);
    if (allowAdminSample) {
      try {
        await requireCurrentAdmin("/dashboard/upload");
      } catch (error) {
        if (error instanceof AdminAccessRequired) return { error: "Admin access required for sample analytics." };
        throw error;
      }
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
      if (error instanceof SnapshotSaveLimitReached) {
        await recordSecurityEvent({ event: "limit_refused", result: "analyticsSnapshotSave", route: "/dashboard/upload", who: { account: session.user.id } });
      }
      if (error instanceof SnapshotApprovalError) return { error: error.message };
      throw error;
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
  });
}
