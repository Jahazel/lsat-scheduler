import { eq, inArray } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";
import { activityCheckIns } from "./postgresSchema";
import type { ActivityCheckIn, PersistedWeeklySchedule } from "./types";

function activityCheckIn(record: typeof activityCheckIns.$inferSelect): ActivityCheckIn {
  return {
    id: record.id,
    scheduleId: record.scheduleId,
    activityId: record.activityId,
    status: record.status,
    ...(record.actualMinutes === null ? {} : { actualMinutes: record.actualMinutes }),
  };
}

export const postgresActivityCheckIns = {
  async listForSchedule(scheduleId: string) {
    const records = await getPostgresDatabase().select().from(activityCheckIns)
      .where(eq(activityCheckIns.scheduleId, scheduleId));
    return records.map(activityCheckIn);
  },
  async listForSchedules(scheduleIds: string[]) {
    if (scheduleIds.length === 0) return [];
    const records = await getPostgresDatabase().select().from(activityCheckIns)
      .where(inArray(activityCheckIns.scheduleId, scheduleIds));
    return records.map(activityCheckIn);
  },
  async save({ scheduleId, activityId, status, actualMinutes }: Omit<ActivityCheckIn, "id">, now = new Date()) {
    const values = { status, actualMinutes: status === "completed" ? actualMinutes ?? null : null };
    const [record] = await getPostgresDatabase().insert(activityCheckIns)
      .values({ scheduleId, activityId, ...values, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [activityCheckIns.scheduleId, activityCheckIns.activityId],
        set: { ...values, updatedAt: now },
      }).returning();
    if (!record) throw new Error("Activity check-in could not be saved");
    return activityCheckIn(record);
  },
  async ensureForSchedule(schedule: PersistedWeeklySchedule, createdAt = new Date()) {
    const values = Object.entries(schedule.schedule.days).flatMap(([day, plan]) =>
      plan.activities.map((_, index) => ({
        scheduleId: schedule.id, activityId: `${day}:${index}`, status: "not_started" as const,
        createdAt, updatedAt: createdAt,
      }))
    );
    if (values.length === 0) return;
    await getPostgresDatabase().insert(activityCheckIns).values(values)
      .onConflictDoNothing({ target: [activityCheckIns.scheduleId, activityCheckIns.activityId] });
  },
};
