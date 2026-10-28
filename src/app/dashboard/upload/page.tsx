import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { readScanningOff } from "@/lib/scanSpending";
import { studentSideClock } from "@/lib/studentClock";
import { findStudentByAccountId } from "@/lib/studentRepository";
import type { Student } from "@/lib/types";
import { listWeeklySchedulesForStudent } from "@/lib/weeklyScheduleRepository";
import { openWeeklyUpload } from "@/lib/weeklyUpload";
import WeeklyUploadFlow from "./WeeklyUploadFlow";

export default async function WeeklyUploadPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const doc = await findStudentByAccountId(session.user.id);
  if (!doc) redirect("/onboarding");

  const student: Student = {
    currentScore: doc.currentScore,
    goalScore: doc.goalScore,
    dailyCapacityMinutes: doc.dailyCapacityMinutes,
    preferredPracticeTestDay: doc.preferredPracticeTestDay,
    accommodationMultiplier: doc.accommodationMultiplier,
    goalTestDate: doc.goalTestDate,
  };
  const [clock, schedules, snapshots] = await Promise.all([
    studentSideClock(session.user),
    listWeeklySchedulesForStudent(doc.id),
    listApprovedAnalyticsSnapshots(doc.id),
  ]);
  const basis = openWeeklyUpload({ clock, student, schedules, snapshots });
  if (!basis) redirect("/dashboard");

  return <WeeklyUploadFlow basis={basis} initialScore={doc.currentScore} scanningOff={await readScanningOff(clock.real)} />;
}
