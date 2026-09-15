import { describe, expect, it, vi } from "vitest";
import {
  WEEKLY_SCHEDULE_INDEX,
  WEEKLY_SCHEDULE_INDEX_NAME,
  migrateWeeklySchedules,
} from "./migrate-weekly-schedules.mjs";

describe("migrateWeeklySchedules", () => {
  it("creates the weekly-schedule uniqueness index once and is safe to repeat", async () => {
    const collection = {
      indexes: vi
        .fn()
        .mockResolvedValueOnce([{ name: "_id_", key: { _id: 1 } }])
        .mockResolvedValueOnce([
          { name: "_id_", key: { _id: 1 } },
          { name: "studentId_1_weekStartDate_1", key: { studentId: 1, weekStartDate: 1 }, unique: true },
        ]),
      createIndex: vi.fn().mockResolvedValue("studentId_1_weekStartDate_1"),
    };

    await migrateWeeklySchedules(collection);
    await migrateWeeklySchedules(collection);

    expect(collection.createIndex).toHaveBeenCalledTimes(1);
    expect(collection.createIndex).toHaveBeenCalledWith(WEEKLY_SCHEDULE_INDEX, {
      unique: true,
      name: WEEKLY_SCHEDULE_INDEX_NAME,
    });
  });

  it("repairs a named weekly-schedule index that does not enforce uniqueness", async () => {
    const collection = {
      indexes: vi.fn().mockResolvedValue([
        { name: WEEKLY_SCHEDULE_INDEX_NAME, key: WEEKLY_SCHEDULE_INDEX, unique: false },
      ]),
      dropIndex: vi.fn().mockResolvedValue(undefined),
      createIndex: vi.fn().mockResolvedValue(WEEKLY_SCHEDULE_INDEX_NAME),
    };

    await migrateWeeklySchedules(collection);

    expect(collection.dropIndex).toHaveBeenCalledWith(WEEKLY_SCHEDULE_INDEX_NAME);
    expect(collection.createIndex).toHaveBeenCalledWith(WEEKLY_SCHEDULE_INDEX, {
      unique: true,
      name: WEEKLY_SCHEDULE_INDEX_NAME,
    });
  });
});
