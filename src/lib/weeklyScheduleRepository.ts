import { and, desc, eq, lt } from "drizzle-orm";
import { listApprovedAnalyticsSnapshots } from "./analyticsSnapshotRepository";
import type { CurrentWeekRepositories } from "./currentWeeklySchedule";
import { postgresActivityCheckIns } from "./activityCheckInRepository";
import { listApprovedPracticeTestResults } from "./weeklyUploadRepository";
import { getPostgresDatabase } from "./postgres";
import { weeklySchedules } from "./postgresSchema";
import type { SavedActivity, SavedWeeklySchedule } from "./postgresSchema";
import type { Activity, DayOfWeek, DayPlan, PersistedWeeklySchedule, WeeklySchedule } from "./types";

function currentActivity(activity: SavedActivity): Activity {
  if (!("type" in activity)) return activity;
  const { kind, drillMinutes, reviewMinutes } = activity;
  if (activity.isFullSection) return { kind, isFullSection: true, drillMinutes, reviewMinutes };
  if (activity.kind === "LR") {
    return { kind: "LR", isFullSection: false, types: [activity.type], questionCount: activity.questionCount,
      difficultyRange: activity.difficultyRange, drillMinutes, reviewMinutes };
  }
  if (activity.passageCount !== 1) throw new Error(`A saved RC drill holds ${activity.passageCount} passages`);
  return { kind: "RC", isFullSection: false,
    passages: [{ type: activity.type, difficultyLevel: activity.difficultyLevel }], drillMinutes, reviewMinutes };
}

function currentSchedule(schedule: SavedWeeklySchedule): WeeklySchedule {
  const days = Object.fromEntries(Object.entries(schedule.days).map(([day, plan]) =>
    [day, { ...plan, activities: plan.activities.map(currentActivity) }])) as Record<DayOfWeek, DayPlan>;
  return { ...schedule, days };
}

export function persistedWeeklySchedule(record: typeof weeklySchedules.$inferSelect): PersistedWeeklySchedule {
  return {
    id: record.id,
    studentId: record.studentId,
    weekStartDate: record.weekStartDate,
    generatedAt: record.generatedAt.toISOString(),
    schedule: currentSchedule(record.schedule),
    sourceSnapshotIds: record.sourceSnapshotIds,
    generationInputs: record.generationInputs,
    policyVersion: record.policyVersion,
  };
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
  practiceTestResults: { listForStudent: listApprovedPracticeTestResults },
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
