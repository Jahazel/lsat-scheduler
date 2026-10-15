import { and, desc, eq, lt } from "drizzle-orm";
import { listApprovedAnalyticsSnapshots } from "./analyticsSnapshotRepository";
import type { CurrentWeekRepositories } from "./currentWeeklySchedule";
import { postgresActivityCheckIns } from "./activityCheckInRepository";
import { getPostgresDatabase } from "./postgres";
import { weeklySchedules } from "./postgresSchema";
import type { PersistedWeeklySchedule } from "./types";

export function persistedWeeklySchedule(record: typeof weeklySchedules.$inferSelect): PersistedWeeklySchedule {
  return { ...record, generatedAt: record.generatedAt.toISOString() };
}

export async function findWeeklyScheduleForStudent(studentId: string, scheduleId: string) {
  const [record] = await getPostgresDatabase().select().from(weeklySchedules)
    .where(and(eq(weeklySchedules.studentId, studentId), eq(weeklySchedules.id, scheduleId)));
  return record ? persistedWeeklySchedule(record) : null;
}

async function findByStudentAndWeek(studentId: string, weekStartDate: string) {
  const [record] = await getPostgresDatabase().select().from(weeklySchedules)
    .where(and(eq(weeklySchedules.studentId, studentId), eq(weeklySchedules.weekStartDate, weekStartDate)));
  return record ? persistedWeeklySchedule(record) : null;
}

export const postgresCurrentWeekRepositories: CurrentWeekRepositories = {
  snapshots: { listEligibleForStudent: listApprovedAnalyticsSnapshots },
  weeklySchedules: {
    findByStudentAndWeek,
    async listBeforeWeek(studentId, weekStartDate) {
      const records = await getPostgresDatabase().select().from(weeklySchedules)
        .where(and(eq(weeklySchedules.studentId, studentId), lt(weeklySchedules.weekStartDate, weekStartDate)))
        .orderBy(desc(weeklySchedules.weekStartDate));
      return records.map(persistedWeeklySchedule);
    },
    async create(schedule) {
      const [record] = await getPostgresDatabase().insert(weeklySchedules).values({
        studentId: schedule.studentId,
        weekStartDate: schedule.weekStartDate,
        generatedAt: new Date(schedule.generatedAt),
        schedule: schedule.schedule,
        sourceSnapshotIds: schedule.sourceSnapshotIds,
        generationInputs: schedule.generationInputs,
        policyVersion: schedule.policyVersion,
      }).onConflictDoNothing({ target: [weeklySchedules.studentId, weeklySchedules.weekStartDate] }).returning();
      if (record) return persistedWeeklySchedule(record);
      // A separate statement sees the winner after a concurrent insert commits.
      const existing = await findByStudentAndWeek(schedule.studentId, schedule.weekStartDate);
      if (!existing) throw new Error("Weekly schedule could not be saved");
      return existing;
    },
  },
  activityCheckIns: postgresActivityCheckIns,
};

export async function listWeeklySchedulesForStudent(studentId: string) {
  const records = await getPostgresDatabase().select().from(weeklySchedules)
    .where(eq(weeklySchedules.studentId, studentId)).orderBy(desc(weeklySchedules.weekStartDate));
  return records.map(persistedWeeklySchedule);
}
