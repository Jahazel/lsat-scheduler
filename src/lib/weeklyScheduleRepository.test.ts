import { describe, expect, it } from "vitest";
import { activityLabel } from "./activityLabel";
import { generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { SavedWeeklySchedule } from "./postgresSchema";
import { persistedWeeklySchedule } from "./weeklyScheduleRepository";

describe("saved weekly schedule reads", () => {
  it("returns saved sentences verbatim without consulting current settings", () => {
    const schedule = generateWeek({ ...mockStudent, currentScore: 149 }, mockAnalytics, mockRules, mockStudentName);
    if (!schedule.reasons?.length) throw new Error("Expected schedule reasons");
    schedule.reasons[0].sentence = "The sentence saved under an older policy.";
    const record = {
      id: "schedule-1", studentId: "student-1", weekStartDate: schedule.weekOf,
      generatedAt: new Date("2026-08-24T14:00:00.000Z"), schedule,
      sourceSnapshotIds: ["snapshot-1"],
      generationInputs: {
        student: { ...mockStudent, dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, SATURDAY: 480 } },
        timezone: "America/Chicago", remainingDays: ["MONDAY" as const], analytics: mockAnalytics,
        priorWeekProgress: { source: "unavailable" as const, skippedPlannedMinutes: 0,
          totalPlannedMinutes: 0, skipShare: 0, skipReductionPercent: 0 },
      },
      policyVersion: "adaptive-weekly-schedule-v2",
    };

    expect(persistedWeeklySchedule(record).schedule.reasons?.[0].sentence)
      .toBe("The sentence saved under an older policy.");
  });

  it.each(["adaptive-weekly-schedule-v1", "adaptive-weekly-schedule-v2"])(
    "leaves an older %s record without reasons", (policyVersion) => {
    const schedule = {
      studentName: mockStudentName,
      weekOf: "2026-08-24",
      days: {
        MONDAY: { day: "MONDAY" as const, type: "drill" as const, activities: [], totalMinutes: 0 },
        TUESDAY: { day: "TUESDAY" as const, type: "drill" as const, activities: [], totalMinutes: 0 },
        WEDNESDAY: { day: "WEDNESDAY" as const, type: "rest" as const, activities: [], totalMinutes: 0 },
        THURSDAY: { day: "THURSDAY" as const, type: "drill" as const, activities: [], totalMinutes: 0 },
        FRIDAY: { day: "FRIDAY" as const, type: "drill" as const, activities: [], totalMinutes: 0 },
        SATURDAY: { day: "SATURDAY" as const, type: "practice_test" as const,
          activities: [{ kind: "PT" as const, label: "Practice Test", minutes: 150 }], totalMinutes: 150 },
        SUNDAY: { day: "SUNDAY" as const, type: "review" as const,
          activities: [{ kind: "REVIEW" as const, label: "PT Review + Blind Review", minutes: 150 }], totalMinutes: 150 },
      },
      saturdayOverageMinutes: 60,
    };
    const record = {
      id: "schedule-1", studentId: "student-1", weekStartDate: schedule.weekOf,
      generatedAt: new Date("2026-08-24T14:00:00.000Z"), schedule, sourceSnapshotIds: [],
      generationInputs: {
        student: mockStudent, timezone: "America/Chicago", remainingDays: ["MONDAY" as const],
        analytics: mockAnalytics,
        priorWeekProgress: { source: "unavailable" as const, skippedPlannedMinutes: 0,
          totalPlannedMinutes: 0, skipShare: 0, skipReductionPercent: 0 },
      },
      policyVersion,
    };

    expect(persistedWeeklySchedule(record).schedule).toEqual(schedule);
    expect(persistedWeeklySchedule(record).schedule.reasons).toBeUndefined();
  });

  it("reads saved v2 activities into the current activity model and labels them", () => {
    const empty = { activities: [], totalMinutes: 0 };
    const schedule: SavedWeeklySchedule = {
      studentName: mockStudentName,
      weekOf: "2026-09-14",
      days: {
        MONDAY: { day: "MONDAY", type: "drill", totalMinutes: 77.5, activities: [
          { kind: "LR", type: "Conditional reasoning", questionCount: 25, difficultyRange: "L3-5",
            drillMinutes: 60, isFullSection: true },
          { kind: "LR", type: "Inference", questionCount: 5, difficultyRange: "L2-4", drillMinutes: 7.5,
            isFullSection: false },
          { kind: "RC", type: "Law", passageCount: 1, difficultyLevel: 3, drillMinutes: 10, isFullSection: false },
        ] },
        TUESDAY: { day: "TUESDAY", type: "drill", totalMinutes: 60, activities: [
          { kind: "RC", type: "Art", passageCount: 4, difficultyLevel: 2, drillMinutes: 60, isFullSection: true },
        ] },
        WEDNESDAY: { day: "WEDNESDAY", type: "rest", ...empty },
        THURSDAY: { day: "THURSDAY", type: "drill", ...empty },
        FRIDAY: { day: "FRIDAY", type: "drill", ...empty },
        SATURDAY: { day: "SATURDAY", type: "practice_test", totalMinutes: 150,
          activities: [{ kind: "PT", label: "Practice Test (from PT 101+)", minutes: 150 }] },
        SUNDAY: { day: "SUNDAY", type: "review", ...empty },
      },
      reasons: [],
    };
    const record = {
      id: "schedule-1", studentId: "student-1", weekStartDate: schedule.weekOf,
      generatedAt: new Date("2026-09-14T14:00:00.000Z"), schedule, sourceSnapshotIds: [],
      generationInputs: {
        student: mockStudent, timezone: "America/Chicago", remainingDays: ["MONDAY" as const],
        analytics: mockAnalytics,
        priorWeekProgress: { source: "unavailable" as const, skippedPlannedMinutes: 0,
          totalPlannedMinutes: 0, skipShare: 0, skipReductionPercent: 0 },
      },
      policyVersion: "adaptive-weekly-schedule-v2",
    };

    const { days } = persistedWeeklySchedule(record).schedule;

    expect([...days.MONDAY.activities, ...days.TUESDAY.activities, ...days.SATURDAY.activities].map(activityLabel))
      .toEqual(["1 Full LR Section", "5 Inference (L2-4)", "1 RC Passage Law L3", "1 Full RC Section",
        "Practice Test (from PT 101+)"]);
    expect(days.MONDAY.activities[1]).toEqual({ kind: "LR", types: ["Inference"], questionCount: 5,
      difficultyRange: "L2-4", drillMinutes: 7.5, isFullSection: false });
    expect(days.MONDAY.activities[2]).toEqual({ kind: "RC", passages: [{ type: "Law", difficultyLevel: 3 }],
      drillMinutes: 10, isFullSection: false });
    expect(days.TUESDAY.activities[0]).toEqual({ kind: "RC", drillMinutes: 60, isFullSection: true });
  });

  it("returns current-model activities unchanged", () => {
    const schedule = generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);
    const record = {
      id: "schedule-1", studentId: "student-1", weekStartDate: schedule.weekOf,
      generatedAt: new Date("2026-08-24T14:00:00.000Z"), schedule, sourceSnapshotIds: [],
      generationInputs: {
        student: mockStudent, timezone: "America/Chicago", remainingDays: ["MONDAY" as const],
        analytics: mockAnalytics,
        priorWeekProgress: { source: "unavailable" as const, skippedPlannedMinutes: 0,
          totalPlannedMinutes: 0, skipShare: 0, skipReductionPercent: 0 },
      },
      policyVersion: "adaptive-weekly-schedule-v2",
    };

    expect(persistedWeeklySchedule(record).schedule).toEqual(schedule);
  });
});
