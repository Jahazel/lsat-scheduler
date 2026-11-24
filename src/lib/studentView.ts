import { postgresActivityCheckIns } from "./activityCheckInRepository";
import { listApprovedAnalyticsSnapshots, listStudentIdsWithApprovedAnalytics } from "./analyticsSnapshotRepository";
import { loadAccountPlan, loadAccountPlans } from "./billingRepository";
import { currentWeekInTimezone } from "./currentWeeklySchedule";
import { studentsWhoseWeekIsHeld, withoutHeldWeek } from "./heldWeek";
import { loadReadOnlyCurrentWeek } from "./readOnlyCurrentWeekSchedule";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";
import type { StudentRow } from "./studentList";
import { findStudentWithJoinDate, listStudentsWithOwners } from "./studentRepository";
import type { DayOfWeek } from "./types";
import { uploadHistory } from "./uploadHistory";
import { listStudentIdsWithScheduleForWeek, postgresCurrentWeekRepositories } from "./weeklyScheduleRepository";
import { listPracticeTestsByWeek } from "./weeklyUploadRepository";

const weeklyMinutes = (daily: Record<DayOfWeek, number>) => Object.values(daily).reduce((sum, minutes) => sum + minutes, 0);

/** Saved weeks before this week, newest first, without the held week, with their check-ins. */
export async function loadPastWeeks(studentId: string, thisWeekStart: string) {
  const saved = await postgresCurrentWeekRepositories.weeklySchedules.listBeforeWeek(studentId, thisWeekStart);
  const schedules = await withoutHeldWeek(studentId, saved);
  return { schedules, checkIns: await postgresActivityCheckIns.listForSchedules(schedules.map((schedule) => schedule.id)) };
}

/** Admin-only. Returns null for an invalid ID, a missing student, or an Admin-owned student. */
export async function loadStudentView(id: string, now: Date) {
  const record = await findStudentWithJoinDate(id);
  if (!record) return null;
  const thisWeekStart = currentWeekInTimezone(now, SCHEDULE_TIMEZONE);
  const [plan, snapshots, practiceTests] = await Promise.all([
    loadAccountPlan(record.userId),
    listApprovedAnalyticsSnapshots(record.id),
    listPracticeTestsByWeek(record.id),
  ]);
  const [pastWeeks, thisWeek] = await Promise.all([
    loadPastWeeks(record.id, thisWeekStart),
    loadReadOnlyCurrentWeek({
      ...postgresCurrentWeekRepositories,
      activityCheckIns: postgresActivityCheckIns,
      studentId: record.id,
      timezone: SCHEDULE_TIMEZONE,
      now: () => now,
    }),
  ]);
  return {
    student: { ...record, weeklyMinutes: weeklyMinutes(record.dailyCapacityMinutes) },
    plan: plan.status.kind,
    needsAnalytics: snapshots.length === 0,
    thisWeekStart,
    thisWeek,
    pastWeeks,
    uploads: uploadHistory(snapshots, practiceTests),
  };
}

/** Admin-only. Excludes Admin-owned students. */
export async function listStudentRows(now: Date): Promise<StudentRow[]> {
  const week = currentWeekInTimezone(now, SCHEDULE_TIMEZONE);
  const [students, withAnalytics, withThisWeek] = await Promise.all([
    listStudentsWithOwners(),
    listStudentIdsWithApprovedAnalytics(),
    listStudentIdsWithScheduleForWeek(week),
  ]);
  const analytics = new Set(withAnalytics);
  const thisWeek = new Set(withThisWeek);
  const [plans, held] = await Promise.all([
    loadAccountPlans(students.map((student) => student.userId)),
    studentsWhoseWeekIsHeld(students.filter((student) => thisWeek.has(student.id)).map((student) => student.id), week),
  ]);
  return students.map((student) => {
    const plan = plans.get(student.userId);
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      plan: plan?.status.kind ?? "no_plan",
      needsAnalytics: !analytics.has(student.id),
      thisWeek: !thisWeek.has(student.id) ? "none" : held.has(student.id) ? "held" : "ready",
      weeklyMinutes: weeklyMinutes(student.dailyCapacityMinutes),
      goalTestDate: student.goalTestDate,
      joinedAt: student.joinedAt,
    };
  });
}
