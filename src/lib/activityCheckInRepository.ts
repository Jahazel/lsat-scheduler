import { ActivityCheckInModel } from "@/models/ActivityCheckIn";
import type { ActivityCheckIn, ActivityCheckInStatus } from "./types";
import type { PersistedWeeklySchedule } from "./types";

interface StoredActivityCheckIn {
  _id: unknown;
  scheduleId: unknown;
  activityId: string;
  status: ActivityCheckInStatus;
  actualMinutes?: number;
}

function activityCheckIn(record: StoredActivityCheckIn): ActivityCheckIn {
  return {
    id: String(record._id),
    scheduleId: String(record.scheduleId),
    activityId: record.activityId,
    status: record.status,
    ...(record.actualMinutes === undefined ? {} : { actualMinutes: record.actualMinutes }),
  };
}

export const mongooseActivityCheckIns = {
  async listForSchedule(scheduleId: string) {
    const records = await ActivityCheckInModel.find({ scheduleId }).lean();
    return records.map(activityCheckIn);
  },
  async save({
    scheduleId,
    activityId,
    status,
    actualMinutes,
  }: Omit<ActivityCheckIn, "id">): Promise<ActivityCheckIn> {
    const update =
      status === "completed" && actualMinutes !== undefined
        ? { $set: { status, actualMinutes } }
        : { $set: { status }, $unset: { actualMinutes: 1 } };
    const record = await ActivityCheckInModel.findOneAndUpdate(
      { scheduleId, activityId },
      update,
      { new: true, upsert: true, runValidators: true }
    ).lean();
    if (!record) throw new Error("Activity check-in could not be saved");
    return activityCheckIn(record);
  },
  async ensureForSchedule(schedule: PersistedWeeklySchedule) {
    const writes = Object.entries(schedule.schedule.days).flatMap(([day, plan]) =>
      plan.activities.map((_, index) => ({
        scheduleId: schedule.id,
        activityId: `${day}:${index}`,
      }))
    );
    await Promise.all(
      writes.map(({ scheduleId, activityId }) =>
        ActivityCheckInModel.updateOne(
          { scheduleId, activityId },
          { $setOnInsert: { scheduleId, activityId, status: "not_started" } },
          { upsert: true }
        ).exec()
      )
    );
  },
};
