import { describe, expect, it } from "vitest";
import {
  analyticsTrend,
  currentWeekInTimezone,
  loadOrGenerateCurrentWeek,
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
  let checkIns: { scheduleId: string; activityId: string; status: "not_started" | "completed" }[] = [];
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
      listBeforeWeek: async (studentId: string, weekStartDate: string) =>
        schedules.filter((schedule) => schedule.studentId === studentId && schedule.weekStartDate < weekStartDate),
      create: async (schedule: PersistedWeeklySchedule) => {
        const existing = schedules.find(
          (saved) => saved.studentId === schedule.studentId && saved.weekStartDate === schedule.weekStartDate
        );
        if (existing) return existing;
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
      student: { ...mockStudent, currentScore: 149 },
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
    expect(first.schedule.generationInputs.priorScheduleIds).toEqual([]);
    expect(first.schedule.generationInputs).not.toHaveProperty("priorWeekProgress");
    expect(first.schedule.policyVersion).toBe("adaptive-weekly-schedule-v3");
    const originalSentences = first.schedule.schedule.reasons?.map((reason) => reason.sentence);
    expect(originalSentences?.length).toBeGreaterThan(0);
    expect(second.kind === "schedule" && second.schedule.schedule.reasons?.map((reason) => reason.sentence))
      .toEqual(originalSentences);
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
      { scheduleId: first.schedule.id, activityId: "MONDAY:0", status: "completed" },
    ]);

    await expect(loadOrGenerateCurrentWeek(input)).resolves.toEqual(first);
    expect(repositories.checkIns()).toContainEqual({
      scheduleId: first.schedule.id,
      activityId: "MONDAY:0",
      status: "completed",
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

  it("weights RC passage-type accuracy like LR and skips snapshots approved before RC analytics", () => {
    const newest = approvedSnapshot("newest", "2026-09-14T13:00:00.000Z");
    newest.rcAccuracyByType = { Law: 0.8, Art: 0.5 };
    const previous = approvedSnapshot("previous", "2026-09-14T12:00:00.000Z");
    previous.rcAccuracyByType = { Law: 0.2 };
    const oldest = approvedSnapshot("oldest", "2026-09-14T11:00:00.000Z");

    const trend = analyticsTrend([newest, previous, oldest], "2026-09-14");

    expect(trend.rcAccuracyByType?.Law).toBeCloseTo(0.6, 5);
    expect(trend.rcAccuracyByType?.Art).toBeCloseTo(0.5, 5);
    expect(analyticsTrend([oldest], "2026-09-14").rcAccuracyByType).toBeUndefined();
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

  it("weights the newest three snapshots approved across weeks when this week has an approval", async () => {
    const week0 = approvedSnapshot("week-0", "2026-09-01T15:00:00.000Z");
    week0.lrAccuracyByType = { "Necessary assumption": 0 };
    const week1 = approvedSnapshot("week-1", "2026-09-08T15:00:00.000Z");
    week1.lrAccuracyByType = { "Necessary assumption": 0.4 };
    const week2 = approvedSnapshot("week-2", "2026-09-15T15:00:00.000Z");
    week2.lrAccuracyByType = { "Necessary assumption": 0.45 };
    const week3 = approvedSnapshot("week-3", "2026-09-21T15:00:00.000Z");
    week3.lrAccuracyByType = { "Necessary assumption": 0.9 };
    const repositories = inMemoryRepositories([week0, week1, week2, week3]);

    const result = await loadOrGenerateCurrentWeek({
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      timezone: "America/Chicago",
      now: () => new Date("2026-09-21T16:00:00.000Z"),
      ...repositories,
    });
    if (result.kind !== "schedule") throw new Error("Expected a saved schedule");

    expect(result.schedule.sourceSnapshotIds).toEqual(["week-3", "week-2", "week-1"]);
    expect(result.schedule.generationInputs.analytics.lrAccuracyByType["Necessary assumption"])
      .toBeCloseTo(0.715, 5);
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
    expect(result.schedule.schedule.reasons).toContainEqual({
      code: "unscheduled_day", placement: { scope: "day", day: "FRIDAY" },
      sentence: "Not scheduled because this weekly schedule started Saturday.",
    });
  });

  it("leaves Monday and Tuesday unscheduled when approval arrives Thursday", async () => {
    const repositories = inMemoryRepositories([approvedSnapshot("thursday", "2026-09-17T13:00:00.000Z")]);
    const result = await loadOrGenerateCurrentWeek({
      studentId: "student-1", student: mockStudent, studentName: mockStudentName,
      rules: mockRules, timezone: "America/Chicago",
      now: () => new Date("2026-09-17T14:00:00.000Z"), ...repositories,
    });
    if (result.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(["MONDAY", "TUESDAY"].map((day) => result.schedule.schedule.days[day as "MONDAY" | "TUESDAY"].type))
      .toEqual(["unscheduled", "unscheduled"]);
    expect(result.schedule.schedule.days.MONDAY.activities).toEqual([]);
    expect(result.schedule.schedule.days.TUESDAY.activities).toEqual([]);
    expect(result.schedule.schedule.days.THURSDAY.activities.length).toBeGreaterThan(0);
    expect(result.schedule.schedule.days.FRIDAY.activities.length).toBeGreaterThan(0);
  });

  it("counts unchecked drills in saved schedules for starred rotation", async () => {
    const repositories = inMemoryRepositories([
      approvedSnapshot("first", "2026-09-14T13:00:00.000Z"),
      approvedSnapshot("second", "2026-09-21T13:00:00.000Z"),
    ]);
    const input = {
      studentId: "student-1", student: { ...mockStudent,
        dailyCapacityMinutes: Object.fromEntries(Object.keys(mockStudent.dailyCapacityMinutes).map((day) => [day, 30])) as typeof mockStudent.dailyCapacityMinutes },
      studentName: mockStudentName, rules: mockRules, timezone: "America/Chicago",
      now: () => monday, ...repositories,
    };
    const first = await loadOrGenerateCurrentWeek(input);
    if (first.kind !== "schedule") throw new Error("Expected a saved schedule");
    const skipped = Object.entries(first.schedule.schedule.days).flatMap(([day, plan]) =>
      plan.activities.flatMap((activity, index) => activity.kind === "LR"
        ? [{ scheduleId: first.schedule.id, activityId: `${day}:${index}`, status: "not_started" as const }]
        : []));
    repositories.setCheckIns([...skipped]);
    const firstTypes = new Set(skipped.map((checkIn) => {
      const [day, index] = checkIn.activityId.split(":");
      const activity = first.schedule.schedule.days[day as keyof typeof first.schedule.schedule.days].activities[Number(index)];
      return activity.kind === "LR" && !activity.isFullSection ? activity.types[0] : "";
    }));

    const second = await loadOrGenerateCurrentWeek({
      ...input, now: () => new Date("2026-09-21T14:00:00.000Z"),
    });
    if (second.kind !== "schedule") throw new Error("Expected a saved schedule");
    const nextTypes = Object.values(second.schedule.schedule.days).flatMap((day) => day.activities)
      .flatMap((activity) => activity.kind === "LR" && !activity.isFullSection ? activity.types : []);
    expect(skipped.length).toBeGreaterThan(0);
    expect(nextTypes.length).toBeGreaterThan(0);
    expect(firstTypes.has(nextTypes[0])).toBe(false);
  });

  it("keeps the prior week's Sunday practice-test review day despite a later preference change", async () => {
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
    expect(prior.schedule.schedule.reasons).toContainEqual({
      code: "practice_test_review_day_next_week", placement: { scope: "day", day: "SUNDAY" },
      sentence: "The practice-test review day is next Monday in the next weekly schedule.",
    });
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
    expect(next.schedule.schedule.reasons).toContainEqual({
      code: "review_carried_over", placement: { scope: "day", day: "MONDAY" },
      sentence: "Review for last Sunday's practice test (September 20).",
    });
    expect(next.schedule.generationInputs.priorWeekPracticeTestReviewMinutes).toBe(187.5);
    expect(next.schedule.generationInputs.priorScheduleIds).toEqual([prior.schedule.id]);
  });

  it("saves only the unscheduled reason for a passed carried-over review day", async () => {
    const repositories = inMemoryRepositories([
      approvedSnapshot("first", "2026-09-14T13:00:00.000Z"),
      approvedSnapshot("second", "2026-09-23T13:00:00.000Z"),
    ]);
    const prior = await loadOrGenerateCurrentWeek({
      studentId: "student-1", student: { ...mockStudent, preferredPracticeTestDay: "SUNDAY" },
      studentName: mockStudentName, rules: mockRules, timezone: "America/Chicago", now: () => monday,
      ...repositories,
    });
    if (prior.kind !== "schedule") throw new Error("Expected a saved prior schedule");
    expect(prior.schedule.schedule.days.SUNDAY.type).toBe("practice_test");

    const next = await loadOrGenerateCurrentWeek({
      studentId: "student-1", student: { ...mockStudent, currentScore: 140, dailyCapacityMinutes: {
        ...mockStudent.dailyCapacityMinutes, MONDAY: 60,
      } },
      studentName: mockStudentName, rules: mockRules, timezone: "America/Chicago",
      now: () => new Date("2026-09-23T14:00:00.000Z"), ...repositories,
    });
    if (next.kind !== "schedule") throw new Error("Expected a saved schedule");
    expect(next.schedule.schedule.days.MONDAY.type).toBe("unscheduled");
    expect(next.schedule.schedule.reasons?.filter((item) =>
      item.placement.scope === "day" && item.placement.day === "MONDAY")).toEqual([{
      code: "unscheduled_day", placement: { scope: "day", day: "MONDAY" },
      sentence: "Not scheduled because this weekly schedule started Wednesday.",
    }]);
    expect(next.schedule.schedule.reasons).toContainEqual({
      code: "full_section_dropped", placement: { scope: "week" },
      sentence: "No full section this week: your current score is 140, below 150.",
    });
  });

  it("does not infer a Monday practice-test review day from the current Sunday preference", async () => {
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
    const legacySchedule = generateWeek(mockStudent, { ...mockAnalytics, weekOf: "2026-09-14" },
      mockRules, mockStudentName);
    delete legacySchedule.reasons;
    const saved: PersistedWeeklySchedule = {
      id: "old", studentId: "student-1", weekStartDate: "2026-09-14", generatedAt: monday.toISOString(),
      schedule: { ...legacySchedule, saturdayOverageMinutes: 60 },
      sourceSnapshotIds: [], generationInputs: {
        student: mockStudent, timezone: "America/Chicago", remainingDays: ["MONDAY"], analytics: mockAnalytics,
        priorWeekProgress: { source: "unavailable", skippedPlannedMinutes: 0, totalPlannedMinutes: 0,
          skipShare: 0, workloadReductionPercent: 0 },
      }, policyVersion: "adaptive-weekly-schedule-v1",
    };
    repositories.schedules.push(saved);
    expect(saved.schedule.reasons).toBeUndefined();
    const result = await loadOrGenerateCurrentWeek({
      studentId: "student-1", student: mockStudent, studentName: mockStudentName, rules: mockRules,
      timezone: "America/Chicago", now: () => monday, ...repositories,
    });
    expect(result).toEqual({ kind: "schedule", schedule: saved });
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

  it("fills next week to capacity whatever was left unchecked in the preceding week", async () => {
    const snapshots = () => [
      approvedSnapshot("snapshot-1", "2026-09-14T13:00:00.000Z"),
      approvedSnapshot("snapshot-2", "2026-09-21T13:00:00.000Z"),
    ];
    const skippedRepositories = inMemoryRepositories(snapshots());
    const baselineRepositories = inMemoryRepositories(snapshots());
    const commonInput = {
      studentId: "student-1",
      student: mockStudent,
      studentName: mockStudentName,
      rules: mockRules,
      timezone: "America/Chicago",
    };
    for (const repositories of [skippedRepositories, baselineRepositories]) {
      const prior = await loadOrGenerateCurrentWeek({ ...commonInput, now: () => monday, ...repositories });
      if (prior.kind !== "schedule") throw new Error("Expected a saved prior schedule");
      if (repositories === skippedRepositories) {
        repositories.setCheckIns(Object.entries(prior.schedule.schedule.days).flatMap(([day, plan]) =>
          plan.activities.map((_, index) => ({ scheduleId: prior.schedule.id, activityId: `${day}:${index}`,
            status: "not_started" as const }))));
      }
    }
    const nextWeek = (repositories: typeof skippedRepositories) => loadOrGenerateCurrentWeek({
      ...commonInput, now: () => new Date("2026-09-21T14:00:00.000Z"), ...repositories,
    });
    const skipped = await nextWeek(skippedRepositories);
    const baseline = await nextWeek(baselineRepositories);
    if (skipped.kind !== "schedule" || baseline.kind !== "schedule") throw new Error("Expected saved schedules");
    expect(skipped.schedule.schedule).toEqual(baseline.schedule.schedule);
    expect(skipped.schedule.schedule.days.MONDAY.totalMinutes)
      .toBeGreaterThanOrEqual(mockStudent.dailyCapacityMinutes.MONDAY - 10);
  });

});
