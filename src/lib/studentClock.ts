import { and, eq, sql } from "drizzle-orm";
import { findAccountById, isAccountId } from "./accountRepository";
import { getPostgresDatabase } from "./postgres";
import { accounts } from "./postgresSchema";
import {
  dateInScheduleTimezone,
  resolveStudentClock,
  resolveStudentTime,
  type AdminClockRepository,
} from "./adminTestWorkspace";

export const postgresAdminClock: AdminClockRepository = {
  findUser: findAccountById,
  async moveDate(userId, expected, next) {
    if (!isAccountId(userId)) return false;
    const moved = await getPostgresDatabase()
      .update(accounts)
      .set({ simulatedDate: next })
      .where(and(
        eq(accounts.id, userId),
        eq(accounts.role, "admin"),
        sql`${accounts.simulatedDate} is not distinct from ${expected}::date`,
      ))
      .returning({ id: accounts.id });
    return moved.length === 1;
  },
};

export function studentSideNow(
  user: { id?: string; role?: string },
  real = new Date(),
) {
  return resolveStudentTime(user, real, postgresAdminClock);
}

export function studentSideClock(
  user: { id?: string; role?: string },
  real = new Date(),
) {
  return resolveStudentClock(user, real, postgresAdminClock);
}

export async function studentSideToday(user: { id?: string; role?: string }) {
  return dateInScheduleTimezone(await studentSideNow(user));
}
