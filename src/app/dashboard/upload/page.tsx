import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { uploadWeekOf } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { studentSideClock } from "@/lib/studentClock";
import { findStudentByAccountId } from "@/lib/studentRepository";
import type { Student } from "@/lib/types";
import { listWeeklySchedulesForStudent } from "@/lib/weeklyScheduleRepository";
import { nextWeekBasis } from "@/lib/weeklyUpload";
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
  const basis = nextWeekBasis({ now: clock.now, timezone: SCHEDULE_TIMEZONE, student, schedules, snapshots });

  if (uploadWeekOf(clock.now, SCHEDULE_TIMEZONE) !== basis.weekOf) redirect("/dashboard");

  return <WeeklyUploadFlow basis={basis} initialScore={doc.currentScore} />;
}
