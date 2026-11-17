import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/accessControl";
import { clockForVerifiedUser, dateInScheduleTimezone } from "@/lib/adminTestWorkspace";
import { getPostgresDatabase } from "@/lib/postgres";
import { postgresAdminClock } from "@/lib/studentClock";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { mondayOf, MAX_AHEAD_DAYS, addDays, type LiveSide } from "./model";

export async function loadLiveSide(): Promise<LiveSide> {
  const user = (await auth())?.user;
  if (!user?.id) return { kind: "signed-out" };
  const account = await postgresAdminClock.findUser(user.id);
  if (!isAdminUser(account)) return { kind: "not-admin" };
  const clock = clockForVerifiedUser(account, new Date());
  const today = dateInScheduleTimezone(clock.now);
  const student = await findStudentByAccountId(user.id);
  const saved = student
    ? (await getPostgresDatabase().execute<{ week: string }>(sql`
        select to_char(week_start_date, 'YYYY-MM-DD') as week from weekly_schedules
        where student_id = ${student.id}::uuid
          and week_start_date between ${mondayOf(today)}::date and ${addDays(today, MAX_AHEAD_DAYS)}::date
      `)).rows.map(({ week }) => week)
    : [];
  return { kind: "ready", today, realDate: dateInScheduleTimezone(clock.real), simulated: clock.simulated, saved };
}
