import { describe, expect, it } from "vitest";
import { generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import { persistedWeeklySchedule } from "./weeklyScheduleRepository";

describe("saved weekly schedule reads", () => {
  it("returns saved sentences verbatim without consulting current settings", () => {
    const schedule = generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);
    if (!schedule.reasons?.length) throw new Error("Expected schedule reasons");
    schedule.reasons[0].sentence = "The sentence saved under an older policy.";
    const record = {
      _id: "schedule-1", studentId: "student-1", weekStartDate: schedule.weekOf,
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
      _id: "schedule-1", studentId: "student-1", weekStartDate: schedule.weekOf,
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
});
