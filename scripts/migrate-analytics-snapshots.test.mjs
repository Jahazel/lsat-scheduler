import { describe, expect, it, vi } from "vitest";
import { migrateAnalyticsSnapshots } from "./migrate-analytics-snapshots.mjs";

describe("migrateAnalyticsSnapshots", () => {
  it("preserves old records as legacy, replaces the unique index, and is safe to repeat", async () => {
    const collection = {
      indexes: vi
        .fn()
        .mockResolvedValueOnce([
          { name: "_id_", key: { _id: 1 } },
          { name: "studentId_1", key: { studentId: 1 }, unique: true },
        ])
        .mockResolvedValueOnce([
          { name: "_id_", key: { _id: 1 } },
          { name: "studentId_1_status_1_approvedAt_-1", key: { studentId: 1, status: 1, approvedAt: -1 } },
        ]),
      dropIndex: vi.fn().mockResolvedValue(undefined),
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      createIndex: vi.fn().mockResolvedValue("studentId_1_status_1_approvedAt_-1"),
    };
    const migratedAt = new Date("2026-09-14T16:00:00.000Z");

    await migrateAnalyticsSnapshots(collection, migratedAt);
    await migrateAnalyticsSnapshots(collection, migratedAt);

    expect(collection.dropIndex).toHaveBeenCalledTimes(1);
    expect(collection.dropIndex).toHaveBeenCalledWith("studentId_1");
    expect(collection.updateMany).toHaveBeenCalledWith(
      { status: { $exists: false } },
      {
        $set: {
          status: "legacy",
          legacy: { migratedAt, source: "single-snapshot-storage" },
        },
      },
    );
    expect(collection.createIndex).toHaveBeenCalledTimes(1);
    expect(collection.createIndex).toHaveBeenCalledWith(
      { studentId: 1, status: 1, approvedAt: -1 },
      { name: "studentId_1_status_1_approvedAt_-1" },
    );
  });
});
