import { describe, expect, it, vi } from "vitest";
import { verifyAdaptiveScheduleRollout } from "./verify-adaptive-schedule-rollout.mjs";

const requiredIndexes = {
  analytics: { name: "studentId_1_status_1_approvedAt_-1", key: { studentId: 1, status: 1, approvedAt: -1 } },
  schedules: { name: "studentId_1_weekStartDate_1", key: { studentId: 1, weekStartDate: 1 }, unique: true },
  checkIns: { name: "scheduleId_1_activityId_1", key: { scheduleId: 1, activityId: 1 }, unique: true },
};

function collection(indexes, count = 0, records = []) {
  return {
    indexes: vi.fn().mockResolvedValue(indexes),
    countDocuments: vi.fn().mockResolvedValue(count),
    findOne: vi.fn((query) => Promise.resolve(records.find((record) =>
      Object.entries(query).every(([key, value]) => String(record[key]) === String(value))
    ) ?? null)),
  };
}

describe("verifyAdaptiveScheduleRollout", () => {
  it("confirms migration-created indexes and reports retained legacy history", async () => {
    const analyticsSnapshots = collection([requiredIndexes.analytics], 2, [
      { _id: "legacy-1", studentId: "student-1", status: "legacy", legacy: { source: "single-snapshot-storage", migratedAt: new Date() } },
      { _id: "snapshot-1", studentId: "student-1", status: "approved" },
    ]);
    const weeklySchedules = collection([requiredIndexes.schedules], 0, [
      { _id: "schedule-1", studentId: "student-1", sourceSnapshotIds: ["snapshot-1"], policyVersion: "adaptive-weekly-schedule-v1", generationInputs: {} },
    ]);
    const activityCheckIns = collection([requiredIndexes.checkIns], 0, [
      { scheduleId: "schedule-1", activityId: "MONDAY:0", status: "not_started" },
    ]);

    await expect(
      verifyAdaptiveScheduleRollout({ analyticsSnapshots, weeklySchedules, activityCheckIns, representativeStudentId: "student-1" })
    ).resolves.toEqual({ legacyAnalyticsRecords: 2 });

    expect(analyticsSnapshots.countDocuments).toHaveBeenCalledWith({ status: "legacy" });
  });

  it("rejects a representative legacy record without migration provenance", async () => {
    await expect(
      verifyAdaptiveScheduleRollout({
        analyticsSnapshots: collection([requiredIndexes.analytics], 1, [
          { studentId: "student-1", status: "legacy" },
          { _id: "snapshot-1", studentId: "student-1", status: "approved" },
        ]),
        weeklySchedules: collection([requiredIndexes.schedules], 0, [
          { _id: "schedule-1", studentId: "student-1", sourceSnapshotIds: ["snapshot-1"], policyVersion: "v1", generationInputs: {} },
        ]),
        activityCheckIns: collection([requiredIndexes.checkIns], 0, [
          { scheduleId: "schedule-1", activityId: "MONDAY:0", status: "not_started" },
        ]),
        representativeStudentId: "student-1",
      })
    ).rejects.toThrow("migration provenance");
  });

  it("rejects a schedule whose source is a legacy snapshot", async () => {
    await expect(
      verifyAdaptiveScheduleRollout({
        analyticsSnapshots: collection([requiredIndexes.analytics], 1, [
          { _id: "legacy-1", studentId: "student-1", status: "legacy", legacy: { source: "single-snapshot-storage", migratedAt: new Date() } },
          { _id: "snapshot-1", studentId: "student-1", status: "approved" },
        ]),
        weeklySchedules: collection([requiredIndexes.schedules], 0, [
          { _id: "schedule-1", studentId: "student-1", sourceSnapshotIds: ["legacy-1"], policyVersion: "v1", generationInputs: {} },
        ]),
        activityCheckIns: collection([requiredIndexes.checkIns], 0, [
          { scheduleId: "schedule-1", activityId: "MONDAY:0", status: "not_started" },
        ]),
        representativeStudentId: "student-1",
      })
    ).rejects.toThrow("approved analytics sources");
  });

  it("rejects a leftover unique-per-student analytics index before dashboard and admin reads are enabled", async () => {
    await expect(
      verifyAdaptiveScheduleRollout({
        analyticsSnapshots: collection([
          requiredIndexes.analytics,
          { name: "studentId_1", key: { studentId: 1 }, unique: true },
        ]),
        weeklySchedules: collection([requiredIndexes.schedules]),
        activityCheckIns: collection([requiredIndexes.checkIns]),
      })
    ).rejects.toThrow("legacy unique analytics index");
  });

  it("rejects named indexes that do not enforce the required uniqueness", async () => {
    await expect(
      verifyAdaptiveScheduleRollout({
        analyticsSnapshots: collection([requiredIndexes.analytics]),
        weeklySchedules: collection([{ ...requiredIndexes.schedules, unique: false }]),
        activityCheckIns: collection([requiredIndexes.checkIns]),
      })
    ).rejects.toThrow("studentId_1_weekStartDate_1");
  });
});
