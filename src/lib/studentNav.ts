import { sql } from "drizzle-orm";
import { getPostgresDatabase } from "@/lib/postgres";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { currentWeekInTimezone } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { testCountdown, testCountdownLabel } from "@/lib/testCountdown";

export interface StudentNavState {
  countdownLabel: string | null;
  isTestDay: boolean;
  uploadNeeded: boolean;
  hasCurrentWeek?: boolean;
}

export function initialsFor(name: string | null | undefined, email: string | null | undefined) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email?.[0] ?? "?").toUpperCase();
}

/** Returns null when the Account has no student profile. */
export async function loadStudentNavState(userId: string, now = new Date()): Promise<StudentNavState | null> {
  const student = await findStudentByAccountId(userId);
  if (!student) return null;

  const countdown = testCountdown(student.goalTestDate, now, SCHEDULE_TIMEZONE);
  const currentWeek = await getPostgresDatabase().execute(sql`
    select 1 from weekly_schedules
    where student_id = ${student.id}::uuid
      and week_start_date = ${currentWeekInTimezone(now, SCHEDULE_TIMEZONE)}::date
    limit 1
  `);
  const hasCurrentWeek = currentWeek.rowCount === 1;

  return {
    countdownLabel: testCountdownLabel(countdown),
    isTestDay: countdown?.kind === "today",
    hasCurrentWeek,
    uploadNeeded: student.platform === "7Sage" && !hasCurrentWeek,
  };
}
