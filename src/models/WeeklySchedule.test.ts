import { describe, expect, it } from "vitest";
import { WEEKLY_SCHEDULE_INDEX, WEEKLY_SCHEDULE_INDEX_NAME } from "../../scripts/migrate-weekly-schedules.mjs";
import { WeeklyScheduleModel, WEEKLY_SCHEDULE_IMMUTABLE_ERROR } from "./WeeklySchedule";

describe("WeeklyScheduleModel indexes", () => {
  it("enforces one immutable weekly schedule per student and Monday week", () => {
    expect(WeeklyScheduleModel.schema.indexes()).toContainEqual([
      WEEKLY_SCHEDULE_INDEX,
      { unique: true, name: WEEKLY_SCHEDULE_INDEX_NAME },
    ]);
  });

  it("rejects nested update attempts", async () => {
    await expect(
      WeeklyScheduleModel.updateOne(
        { _id: "507f1f77bcf86cd799439011" },
        { $set: { "schedule.days.MONDAY.totalMinutes": 1 } }
      ).exec()
    ).rejects.toThrow(WEEKLY_SCHEDULE_IMMUTABLE_ERROR);
  });

  it("rejects full-document replacement attempts", async () => {
    await expect(
      WeeklyScheduleModel.findOneAndReplace(
        { _id: "507f1f77bcf86cd799439011" },
        { weekStartDate: "2026-09-14" }
      ).exec()
    ).rejects.toThrow(WEEKLY_SCHEDULE_IMMUTABLE_ERROR);
  });

  it("rejects bulk write attempts", async () => {
    await expect(
      WeeklyScheduleModel.bulkWrite([
        { updateOne: { filter: { _id: "507f1f77bcf86cd799439011" }, update: { $set: { policyVersion: "v2" } } } },
      ])
    ).rejects.toThrow(WEEKLY_SCHEDULE_IMMUTABLE_ERROR);
  });
});
