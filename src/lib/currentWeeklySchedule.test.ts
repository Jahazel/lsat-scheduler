import { describe, expect, it } from "vitest";
import { analyticsTrend, currentWeekInTimezone, loadOrGenerateCurrentWeek } from "./currentWeeklySchedule";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { ApprovedAnalyticsSnapshot, PersistedWeeklySchedule } from "./types";

const monday = new Date("2026-09-14T14:00:00.000Z");

function approvedSnapshot(id: string, approvedAt: string): ApprovedAnalyticsSnapshot {
  return { ...mockAnalytics, id, approvedAt };
}

function inMemoryRepositories(snapshots: ApprovedAnalyticsSnapshot[]) {
  const schedules: PersistedWeeklySchedule[] = [];
  return {
    schedules,
    snapshots: {
      listEligibleForStudent: async () => snapshots,
    },
    weeklySchedules: {
      findByStudentAndWeek: async (studentId: string, weekStartDate: string) =>
        schedules.find((schedule) => schedule.studentId === studentId && schedule.weekStartDate === weekStartDate) ?? null,
      create: async (schedule: PersistedWeeklySchedule) => {
        const existing = schedules.find(
          (saved) => saved.studentId === schedule.studentId && saved.weekStartDate === schedule.weekStartDate
        );
        if (existing) throw new Error("duplicate weekly schedule");
        schedules.push(schedule);
        return schedule;
      },
    },
  };
}

describe("loadOrGenerateCurrentWeek", () => {
  it("saves the current Chicago week once and returns the identical record on later visits", async () => {
    const repositories = inMemoryRepositories([approvedSnapshot("snapshot-1", "2026-09-14T13:00:00.000Z")]);
    const input = {
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      policyVersion: "adaptive-weekly-schedule-v1",
      timezone: "America/Chicago",
      now: () => monday,
      ...repositories,
    };

    const first = await loadOrGenerateCurrentWeek(input);
    const second = await loadOrGenerateCurrentWeek({
      ...input,
      student: { ...mockStudent, weekdayHours: 8 },
    });

    expect(first.kind).toBe("schedule");
    expect(second).toEqual(first);
    expect(repositories.schedules).toHaveLength(1);
    if (first.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(first.schedule.weekStartDate).toBe("2026-09-14");
    expect(first.schedule.sourceSnapshotIds).toEqual(["snapshot-1"]);
    expect(first.schedule.generationInputs.student.weekdayHours).toBe(mockStudent.weekdayHours);
    expect(first.schedule.generationInputs.analytics.weekOf).toBe("2026-09-14");
    expect(first.schedule.generationInputs.priorWeekProgress).toEqual({
      source: "unavailable",
      skippedPlannedMinutes: 0,
      totalPlannedMinutes: 0,
      skipShare: 0,
      workloadReductionPercent: 0,
    });
    expect(first.schedule.policyVersion).toBe("adaptive-weekly-schedule-v1");
  });

  it("returns an upload prerequisite when there is no eligible approved snapshot", async () => {
    const repositories = inMemoryRepositories([]);

    await expect(
      loadOrGenerateCurrentWeek({
        studentId: "student-1",
        student: mockStudent,
        studentName: mockStudentName,
        rules: mockRules,
        policyVersion: "adaptive-weekly-schedule-v1",
        timezone: "America/Chicago",
        now: () => monday,
        ...repositories,
      })
    ).resolves.toEqual({ kind: "analytics_required" });
  });

  it("uses the Chicago calendar week at a UTC boundary", () => {
    expect(currentWeekInTimezone(new Date("2026-09-14T04:30:00.000Z"), "America/Chicago")).toBe("2026-09-07");
    expect(currentWeekInTimezone(new Date("2026-09-14T05:30:00.000Z"), "America/Chicago")).toBe("2026-09-14");
  });

  it("uses up to three approved snapshots with missing-row renormalization and newest priority flags", () => {
    const newest = approvedSnapshot("newest", "2026-09-14T13:00:00.000Z");
    newest.lrAccuracyByType = { Evaluate: 0.8 };
    newest.lrTopPriorityLogicTypes = ["Causal reasoning"];
    const previous = approvedSnapshot("previous", "2026-09-13T13:00:00.000Z");
    previous.lrAccuracyByType = { Evaluate: 0.2, Inference: 0.4 };
    const oldest = approvedSnapshot("oldest", "2026-09-12T13:00:00.000Z");
    oldest.lrAccuracyByType = { Inference: 0.8 };
    const excluded = approvedSnapshot("excluded", "2026-09-11T13:00:00.000Z");
    excluded.lrAccuracyByType = { Evaluate: 0 };

    const trend = analyticsTrend([newest, previous, oldest, excluded], "2026-09-14");

    expect(trend.lrAccuracyByType.Evaluate).toBeCloseTo(0.6, 5);
    expect(trend.lrAccuracyByType.Inference).toBeCloseTo(0.5, 5);
    expect(trend.lrTopPriorityLogicTypes).toEqual(["Causal reasoning"]);
  });

  it("orders an unsorted repository result by approval time before weighting and saving source references", async () => {
    const oldest = approvedSnapshot("oldest", "2026-09-12T13:00:00.000Z");
    oldest.lrAccuracyByType = { Evaluate: 0 };
    const newest = approvedSnapshot("newest", "2026-09-14T13:00:00.000Z");
    newest.lrAccuracyByType = { Evaluate: 1 };
    const middle = approvedSnapshot("middle", "2026-09-13T13:00:00.000Z");
    middle.lrAccuracyByType = { Evaluate: 0.5 };
    const repositories = inMemoryRepositories([oldest, newest, middle]);

    const result = await loadOrGenerateCurrentWeek({
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      policyVersion: "adaptive-weekly-schedule-v1",
      timezone: "America/Chicago",
      now: () => monday,
      ...repositories,
    });

    if (result.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(result.schedule.sourceSnapshotIds).toEqual(["newest", "middle", "oldest"]);
    expect(result.schedule.generationInputs.analytics.lrAccuracyByType.Evaluate).toBeCloseTo(0.75, 5);
  });

  it("generates only remaining days and preserves the Saturday test overage", async () => {
    const repositories = inMemoryRepositories([approvedSnapshot("snapshot-1", "2026-09-19T13:00:00.000Z")]);
    const result = await loadOrGenerateCurrentWeek({
      studentId: "student-1",
      student: { ...mockStudent, weekendHours: 1 },
      studentName: mockStudentName,
      rules: mockRules,
      policyVersion: "adaptive-weekly-schedule-v1",
      timezone: "America/Chicago",
      now: () => new Date("2026-09-19T17:00:00.000Z"),
      ...repositories,
    });

    if (result.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(result.schedule.schedule.days.FRIDAY.activities).toEqual([]);
    expect(result.schedule.schedule.days.SATURDAY.totalMinutes).toBe(150);
    expect(result.schedule.schedule.saturdayOverageMinutes).toBe(90);
  });

  it("returns the winner when concurrent generation loses the unique-record race", async () => {
    const repositories = inMemoryRepositories([approvedSnapshot("snapshot-1", "2026-09-14T13:00:00.000Z")]);
    const concurrentSchedule: PersistedWeeklySchedule = {
      id: "persisted-id",
      studentId: "student-1",
      weekStartDate: "2026-09-14",
      generatedAt: monday.toISOString(),
      schedule: { studentName: mockStudentName, weekOf: "2026-09-14", days: {} as never },
      sourceSnapshotIds: ["snapshot-1"],
      generationInputs: {
        student: mockStudent,
        timezone: "America/Chicago",
        remainingDays: ["MONDAY"],
        analytics: { ...mockAnalytics, weekOf: "2026-09-14" },
        priorWeekProgress: {
          source: "unavailable",
          skippedPlannedMinutes: 0,
          totalPlannedMinutes: 0,
          skipShare: 0,
          workloadReductionPercent: 0,
        },
      },
      policyVersion: "adaptive-weekly-schedule-v1",
    };
    repositories.weeklySchedules.create = async () => {
      repositories.schedules.push(concurrentSchedule);
      throw { code: 11000 };
    };

    await expect(
      loadOrGenerateCurrentWeek({
        studentId: "student-1",
        student: mockStudent,
        studentName: mockStudentName,
        rules: mockRules,
        policyVersion: "adaptive-weekly-schedule-v1",
        timezone: "America/Chicago",
        now: () => monday,
        ...repositories,
      })
    ).resolves.toEqual({ kind: "schedule", schedule: concurrentSchedule });
  });
});
