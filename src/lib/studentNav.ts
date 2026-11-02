import { eq, sql } from "drizzle-orm";
import { getPostgresDatabase } from "@/lib/postgres";
import { analyticsSnapshots } from "@/lib/postgresSchema";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { approvedForWeek, currentWeekInTimezone, uploadWeekOf } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { testCountdown, testCountdownLabel } from "@/lib/testCountdown";

export interface StudentNavState {
  countdownLabel: string | null;
  isTestDay: boolean;
  uploadNeeded: boolean;
  hasCurrentWeek?: boolean;
  hasUploadWeek?: boolean;
}

export function initialsFor(name: string | null | undefined, email: string | null | undefined) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email?.[0] ?? "?").toUpperCase();
}

/** Returns null when the Account has no student record. */
export async function loadStudentNavState(userId: string, now = new Date()): Promise<StudentNavState | null> {
  const student = await findStudentByAccountId(userId);
  if (!student) return null;

  const countdown = testCountdown(student.goalTestDate, now, SCHEDULE_TIMEZONE);
  const database = getPostgresDatabase();
  const currentWeek = currentWeekInTimezone(now, SCHEDULE_TIMEZONE);
  const uploadWeek = uploadWeekOf(now, SCHEDULE_TIMEZONE);
  const [schedules, snapshots] = await Promise.all([
    database.execute<{ week: string }>(sql`
      select to_char(week_start_date, 'YYYY-MM-DD') as week from weekly_schedules
      where student_id = ${student.id}::uuid
        and week_start_date in (${currentWeek}::date, ${uploadWeek}::date)
    `),
    database.select({ approvedAt: analyticsSnapshots.approvedAt }).from(analyticsSnapshots)
      .where(eq(analyticsSnapshots.studentId, student.id)),
  ]);
  const savedWeeks = new Set(schedules.rows.map(({ week }) => week));
  const hasCurrentWeek = savedWeeks.has(currentWeek);
  // This week builds the weekly schedule while it renders, at the same time as this header.
  // So a confirmed upload turns the dot off before the weekly schedule is saved.
  const approvals = snapshots.map(({ approvedAt }) => ({ approvedAt: approvedAt.toISOString() }));
  const uploadConfirmed = [currentWeek, uploadWeek]
    .some((week) => approvedForWeek(approvals, week, SCHEDULE_TIMEZONE).length > 0);

  return {
    countdownLabel: testCountdownLabel(countdown),
    isTestDay: countdown?.kind === "today",
    hasCurrentWeek,
    hasUploadWeek: savedWeeks.has(uploadWeek),
    uploadNeeded: !hasCurrentWeek && !uploadConfirmed,
  };
}
