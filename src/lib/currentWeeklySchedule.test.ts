import { describe, expect, it } from "vitest";
import {
  analyticsTrend,
  currentWeekInTimezone,
  loadOrGenerateCurrentWeek,
  plannedActivityMinutes,
} from "./currentWeeklySchedule";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import { generateWeek } from "./engine";
import type { ApprovedAnalyticsSnapshot, PersistedWeeklySchedule } from "./types";

const monday = new Date("2026-09-14T14:00:00.000Z");

function approvedSnapshot(id: string, approvedAt: string): ApprovedAnalyticsSnapshot {
  return { ...mockAnalytics, id, approvedAt };
}

function inMemoryRepositories(snapshots: ApprovedAnalyticsSnapshot[]) {
  const schedules: PersistedWeeklySchedule[] = [];
  let checkIns: { scheduleId: string; activityId: string; status: "not_started" | "completed" | "skipped"; actualMinutes?: number }[] = [];
  return {
    schedules,
    checkIns: () => checkIns,
    setCheckIns(next: typeof checkIns) {
      checkIns = next;
    },
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
    activityCheckIns: {
      listForSchedule: async (scheduleId: string) => checkIns.filter((checkIn) => checkIn.scheduleId === scheduleId),
      ensureForSchedule: async (schedule: PersistedWeeklySchedule) => {
        for (const [day, plan] of Object.entries(schedule.schedule.days)) {
          plan.activities.forEach((_, index) => {
            const activityId = `${day}:${index}`;
            if (!checkIns.some((checkIn) => checkIn.scheduleId === schedule.id && checkIn.activityId === activityId)) {
              checkIns.push({ scheduleId: schedule.id, activityId, status: "not_started" });
            }
          });
        }
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
      timezone: "America/Chicago",
      now: () => monday,
      ...repositories,
    };

    const first = await loadOrGenerateCurrentWeek(input);
    const second = await loadOrGenerateCurrentWeek({
      ...input,
      student: { ...mockStudent, dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, MONDAY: 480 } },
    });

    expect(first.kind).toBe("schedule");
    expect(second).toEqual(first);
    expect(repositories.schedules).toHaveLength(1);
    if (first.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(first.schedule.weekStartDate).toBe("2026-09-14");
    expect(first.schedule.sourceSnapshotIds).toEqual(["snapshot-1"]);
    expect(first.schedule.generationInputs.student.dailyCapacityMinutes.MONDAY).toBe(90);
    expect(first.schedule.generationInputs.student.preferredPracticeTestDay).toBe("SATURDAY");
    expect(first.schedule.generationInputs.analytics.weekOf).toBe("2026-09-14");
    expect(first.schedule.generationInputs.priorWeekProgress).toEqual({
      source: "unavailable",
      skippedPlannedMinutes: 0,
      totalPlannedMinutes: 0,
      skipShare: 0,
      workloadReductionPercent: 0,
    });
    expect(first.schedule.policyVersion).toBe("adaptive-weekly-schedule-v2");
    expect(repositories.checkIns()).toHaveLength(
      Object.values(first.schedule.schedule.days).flatMap((day) => day.activities).length
    );
    expect(repositories.checkIns().every((checkIn) => checkIn.status === "not_started")).toBe(true);
  });

  it("prepares missing check-ins without overwriting an existing activity report on a later visit", async () => {
    const repositories = inMemoryRepositories([approvedSnapshot("snapshot-1", "2026-09-14T13:00:00.000Z")]);
    const input = {
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      timezone: "America/Chicago",
      now: () => monday,
      ...repositories,
    };

    const first = await loadOrGenerateCurrentWeek(input);
    if (first.kind !== "schedule") throw new Error("Expected a saved schedule");
    repositories.setCheckIns([
      { scheduleId: first.schedule.id, activityId: "MONDAY:0", status: "completed", actualMinutes: 45 },
    ]);

    await expect(loadOrGenerateCurrentWeek(input)).resolves.toEqual(first);
    expect(repositories.checkIns()).toContainEqual({
      scheduleId: first.schedule.id,
      activityId: "MONDAY:0",
      status: "completed",
      actualMinutes: 45,
    });
    expect(repositories.checkIns()).toHaveLength(
      Object.values(first.schedule.schedule.days).flatMap((day) => day.activities).length
    );
  });

  it("returns an upload prerequisite when there is no eligible approved snapshot", async () => {
    const repositories = inMemoryRepositories([]);

    await expect(
      loadOrGenerateCurrentWeek({
        studentId: "student-1",
        student: mockStudent,
        studentName: mockStudentName,
        rules: mockRules,
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
    const previous = approvedSnapshot("previous", "2026-09-14T12:00:00.000Z");
    previous.lrAccuracyByType = { Evaluate: 0.2, Inference: 0.4 };
    const oldest = approvedSnapshot("oldest", "2026-09-14T11:00:00.000Z");
    oldest.lrAccuracyByType = { Inference: 0.8 };
    const excluded = approvedSnapshot("excluded", "2026-09-14T10:00:00.000Z");
    excluded.lrAccuracyByType = { Evaluate: 0 };

    const trend = analyticsTrend([newest, previous, oldest, excluded], "2026-09-14");

    expect(trend.lrAccuracyByType.Evaluate).toBeCloseTo(0.6, 5);
    expect(trend.lrAccuracyByType.Inference).toBeCloseTo(0.5, 5);
    expect(trend.lrTopPriorityLogicTypes).toEqual(["Causal reasoning"]);
  });

  it("orders an unsorted repository result by approval time before weighting and saving source references", async () => {
    const oldest = approvedSnapshot("oldest", "2026-09-14T11:00:00.000Z");
    oldest.lrAccuracyByType = { Evaluate: 0 };
    const newest = approvedSnapshot("newest", "2026-09-14T13:00:00.000Z");
    newest.lrAccuracyByType = { Evaluate: 1 };
    const middle = approvedSnapshot("middle", "2026-09-14T12:00:00.000Z");
    middle.lrAccuracyByType = { Evaluate: 0.5 };
    const repositories = inMemoryRepositories([oldest, newest, middle]);

    const result = await loadOrGenerateCurrentWeek({
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      timezone: "America/Chicago",
      now: () => monday,
      ...repositories,
    });

    if (result.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(result.schedule.sourceSnapshotIds).toEqual(["newest", "middle", "oldest"]);
    expect(result.schedule.generationInputs.analytics.lrAccuracyByType.Evaluate).toBeCloseTo(0.75, 5);
  });

  it("requires an analytics upload approved during the new week", async () => {
    const repositories = inMemoryRepositories([approvedSnapshot("last-week", "2026-09-14T13:00:00.000Z")]);

    await expect(loadOrGenerateCurrentWeek({
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      timezone: "America/Chicago",
      now: () => new Date("2026-09-21T14:00:00.000Z"),
      ...repositories,
    })).resolves.toEqual({ kind: "analytics_required" });
  });

  it("marks past days unscheduled and records the test-day capacity overage", async () => {
    const repositories = inMemoryRepositories([approvedSnapshot("snapshot-1", "2026-09-19T13:00:00.000Z")]);
    const result = await loadOrGenerateCurrentWeek({
      studentId: "student-1",
      student: { ...mockStudent, dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, SATURDAY: 60 } },
      studentName: mockStudentName,
      rules: mockRules,
      timezone: "America/Chicago",
      now: () => new Date("2026-09-19T17:00:00.000Z"),
      ...repositories,
    });

    if (result.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(result.schedule.schedule.days.FRIDAY.activities).toEqual([]);
    expect(result.schedule.schedule.days.FRIDAY.type).toBe("unscheduled");
    expect(result.schedule.schedule.days.WEDNESDAY.type).toBe("rest");
    expect(result.schedule.schedule.days.SATURDAY.totalMinutes).toBe(150);
    expect(result.schedule.schedule.days.SATURDAY.capacityOverageMinutes).toBe(90);
  });

  it("carries a saved Sunday test into Monday review despite a later preference change", async () => {
    const repositories = inMemoryRepositories([
      approvedSnapshot("first", "2026-09-14T13:00:00.000Z"),
      approvedSnapshot("second", "2026-09-21T13:00:00.000Z"),
    ]);
    const prior = await loadOrGenerateCurrentWeek({
      studentId: "student-1", student: { ...mockStudent, preferredPracticeTestDay: "SUNDAY", accommodationMultiplier: 1.5 },
      studentName: mockStudentName, rules: mockRules, timezone: "America/Chicago", now: () => monday,
      ...repositories,
    });
    if (prior.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(prior.schedule.schedule.days.SUNDAY.type).toBe("practice_test");
    expect(prior.schedule.schedule.days.MONDAY.type).toBe("drill");

    const next = await loadOrGenerateCurrentWeek({
      studentId: "student-1", student: { ...mockStudent, preferredPracticeTestDay: "SATURDAY" },
      studentName: mockStudentName, rules: mockRules, timezone: "America/Chicago",
      now: () => new Date("2026-09-21T14:00:00.000Z"), ...repositories,
    });
    if (next.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(next.schedule.schedule.days.MONDAY.type).toBe("review");
    expect(next.schedule.schedule.days.MONDAY.activities).toEqual([
      { kind: "REVIEW", label: "PT Review + Blind Review", minutes: 187.5 },
    ]);
    expect(next.schedule.schedule.days.MONDAY.capacityOverageMinutes).toBe(97.5);
    expect(next.schedule.schedule.days.SATURDAY.type).toBe("practice_test");
    expect(next.schedule.generationInputs.carryOverReviewMinutes).toBe(187.5);
  });

  it("does not infer Monday review from the current Sunday preference", async () => {
    const repositories = inMemoryRepositories([approvedSnapshot("second", "2026-09-21T13:00:00.000Z")]);
    const result = await loadOrGenerateCurrentWeek({
      studentId: "student-1", student: { ...mockStudent, preferredPracticeTestDay: "SUNDAY" },
      studentName: mockStudentName, rules: mockRules, timezone: "America/Chicago",
      now: () => new Date("2026-09-21T14:00:00.000Z"), ...repositories,
    });
    if (result.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(result.schedule.schedule.days.MONDAY.type).toBe("drill");
  });

  it("keeps a saved v1 schedule exactly as stored", async () => {
    const repositories = inMemoryRepositories([]);
    const saved: PersistedWeeklySchedule = {
      id: "old", studentId: "student-1", weekStartDate: "2026-09-14", generatedAt: monday.toISOString(),
      schedule: { ...generateWeek(mockStudent, { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName),
        saturdayOverageMinutes: 60 },
      sourceSnapshotIds: [], generationInputs: {
        student: mockStudent, timezone: "America/Chicago", remainingDays: ["MONDAY"], analytics: mockAnalytics,
        priorWeekProgress: { source: "unavailable", skippedPlannedMinutes: 0, totalPlannedMinutes: 0,
          skipShare: 0, workloadReductionPercent: 0 },
      }, policyVersion: "adaptive-weekly-schedule-v1",
    };
    repositories.schedules.push(saved);
    const result = await loadOrGenerateCurrentWeek({
      studentId: "student-1", student: mockStudent, studentName: mockStudentName, rules: mockRules,
      timezone: "America/Chicago", now: () => monday, ...repositories,
    });
    expect(result).toEqual({ kind: "schedule", schedule: saved });
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
        timezone: "America/Chicago",
        now: () => monday,
        ...repositories,
      })
    ).resolves.toEqual({ kind: "schedule", schedule: concurrentSchedule });
  });

  it("propagates a non-concurrency persistence failure", async () => {
    const repositories = inMemoryRepositories([approvedSnapshot("snapshot-1", "2026-09-14T13:00:00.000Z")]);
    const failure = new Error("database unavailable");
    repositories.weeklySchedules.create = async () => {
      throw failure;
    };

    await expect(
      loadOrGenerateCurrentWeek({
        studentId: "student-1",
        student: mockStudent,
        studentName: mockStudentName,
        rules: mockRules,
        timezone: "America/Chicago",
        now: () => monday,
        ...repositories,
      })
    ).rejects.toThrow(failure);
  });

  it("uses skipped planned minutes from only the immediately preceding schedule to reduce a future unsaved schedule", async () => {
    const adaptiveRepositories = inMemoryRepositories([
      approvedSnapshot("snapshot-1", "2026-09-14T13:00:00.000Z"),
      approvedSnapshot("snapshot-2", "2026-09-21T13:00:00.000Z"),
    ]);
    const baselineRepositories = inMemoryRepositories([
      approvedSnapshot("snapshot-1", "2026-09-14T13:00:00.000Z"),
      approvedSnapshot("snapshot-2", "2026-09-21T13:00:00.000Z"),
    ]);
    const commonInput = {
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      timezone: "America/Chicago",
    };

    const prior = await loadOrGenerateCurrentWeek({
      ...commonInput,
      now: () => monday,
      ...adaptiveRepositories,
    });
    if (prior.kind !== "schedule") throw new Error("Expected a saved prior schedule");

    const skippedActivity = prior.schedule.schedule.days.MONDAY.activities[0];
    const skippedPlannedMinutes =
      skippedActivity.kind === "LR" || skippedActivity.kind === "RC"
        ? skippedActivity.drillMinutes + skippedActivity.reviewMinutes
        : skippedActivity.minutes;
    const totalPlannedMinutes = Object.values(prior.schedule.schedule.days)
      .flatMap((day) => day.activities)
      .reduce((total, activity) => total + plannedActivityMinutes(activity), 0);
    adaptiveRepositories.setCheckIns([
      { scheduleId: prior.schedule.id, activityId: "MONDAY:0", status: "skipped", actualMinutes: 999 },
    ]);

    const adaptive = await loadOrGenerateCurrentWeek({
      ...commonInput,
      now: () => new Date("2026-09-21T14:00:00.000Z"),
      ...adaptiveRepositories,
    });
    const baseline = await loadOrGenerateCurrentWeek({
      ...commonInput,
      now: () => new Date("2026-09-21T14:00:00.000Z"),
      ...baselineRepositories,
    });

    if (adaptive.kind !== "schedule" || baseline.kind !== "schedule") throw new Error("Expected saved schedules");
    expect(adaptive.schedule.generationInputs.priorWeekProgress).toMatchObject({
      source: "immediately_preceding_schedule",
      skippedPlannedMinutes,
      totalPlannedMinutes,
      skipShare: skippedPlannedMinutes / totalPlannedMinutes,
      workloadReductionPercent: Math.min(0.25, 0.25 * (skippedPlannedMinutes / totalPlannedMinutes)),
    });
    expect(adaptive.schedule.schedule.days.MONDAY.activities.length).toBeLessThanOrEqual(
      baseline.schedule.schedule.days.MONDAY.activities.length
    );
  });

  it("does not let older check-ins alter a future schedule when the immediately preceding week has no skipped work", async () => {
    const repositories = inMemoryRepositories([
      approvedSnapshot("snapshot-1", "2026-09-14T13:00:00.000Z"),
      approvedSnapshot("snapshot-2", "2026-09-21T13:00:00.000Z"),
      approvedSnapshot("snapshot-3", "2026-09-28T13:00:00.000Z"),
    ]);
    const commonInput = {
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      timezone: "America/Chicago",
      ...repositories,
    };
    const older = await loadOrGenerateCurrentWeek({ ...commonInput, now: () => monday });
    const preceding = await loadOrGenerateCurrentWeek({
      ...commonInput,
      now: () => new Date("2026-09-21T14:00:00.000Z"),
    });
    if (older.kind !== "schedule" || preceding.kind !== "schedule") throw new Error("Expected saved schedules");
    repositories.setCheckIns([{ scheduleId: older.schedule.id, activityId: "MONDAY:0", status: "skipped" }]);

    const result = await loadOrGenerateCurrentWeek({
      ...commonInput,
      now: () => new Date("2026-09-28T14:00:00.000Z"),
    });

    if (result.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(result.schedule.generationInputs.priorWeekProgress).toEqual({
      source: "immediately_preceding_schedule",
      skippedPlannedMinutes: 0,
      totalPlannedMinutes: expect.any(Number),
      skipShare: 0,
      workloadReductionPercent: 0,
    });
  });

  it("keeps completed and not-started preceding activities neutral even when they report actual minutes", async () => {
    const repositories = inMemoryRepositories([
      approvedSnapshot("snapshot-1", "2026-09-14T13:00:00.000Z"),
      approvedSnapshot("snapshot-2", "2026-09-21T13:00:00.000Z"),
    ]);
    const commonInput = {
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      timezone: "America/Chicago",
      ...repositories,
    };
    const prior = await loadOrGenerateCurrentWeek({ ...commonInput, now: () => monday });
    if (prior.kind !== "schedule") throw new Error("Expected a saved prior schedule");
    repositories.setCheckIns([
      { scheduleId: prior.schedule.id, activityId: "MONDAY:0", status: "completed", actualMinutes: 999 },
      { scheduleId: prior.schedule.id, activityId: "TUESDAY:0", status: "not_started" },
    ]);

    const result = await loadOrGenerateCurrentWeek({
      ...commonInput,
      now: () => new Date("2026-09-21T14:00:00.000Z"),
    });

    if (result.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(result.schedule.generationInputs.priorWeekProgress).toEqual({
      source: "immediately_preceding_schedule",
      skippedPlannedMinutes: 0,
      totalPlannedMinutes: expect.any(Number),
      skipShare: 0,
      workloadReductionPercent: 0,
    });
  });
});
