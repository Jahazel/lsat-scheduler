import { eq, inArray } from "drizzle-orm";
import { isHeldWeek } from "./planStatus";
import { getPostgresDatabase } from "./postgres";
import { billingRecords, students } from "./postgresSchema";

async function loadHeldRules(studentIds: string[]) {
  if (studentIds.length === 0) return new Map<string, (weekStartDate: string) => boolean>();
  const rows = await getPostgresDatabase()
    .select({
      studentId: students.id,
      freeWeekEndsAt: billingRecords.freeWeekEndsAt,
      firstChargeSucceeded: billingRecords.firstChargeSucceeded,
    })
    .from(students)
    .innerJoin(billingRecords, eq(billingRecords.accountId, students.accountId))
    .where(inArray(students.id, studentIds));
  return new Map(rows.map((row) => [row.studentId, (weekStartDate: string) => isHeldWeek(row, weekStartDate)]));
}

export async function isWeekHeld(studentId: string, weekStartDate: string) {
  return (await loadHeldRules([studentId])).get(studentId)?.(weekStartDate) ?? false;
}

export async function withoutHeldWeek<T extends { weekStartDate: string }>(studentId: string, schedules: T[]) {
  const held = (await loadHeldRules([studentId])).get(studentId);
  return held ? schedules.filter((schedule) => !held(schedule.weekStartDate)) : schedules;
}

export async function studentsWhoseWeekIsHeld(studentIds: string[], weekStartDate: string) {
  const rules = await loadHeldRules(studentIds);
  return new Set(studentIds.filter((id) => rules.get(id)?.(weekStartDate)));
}
