import { describe, expect, it } from "vitest";
import { generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { PersistedWeeklySchedule, Student } from "./types";
import { nextWeekBasis } from "./weeklyUpload";

const TIMEZONE = "America/Chicago";
const saturday = new Date("2026-10-03T15:00:00.000Z");

function savedWeek(weekStartDate: string, student: Student = mockStudent): PersistedWeeklySchedule {
  return {
    id: `student:${weekStartDate}`,
    studentId: "student",
    weekStartDate,
    generatedAt: `${weekStartDate}T12:00:00.000Z`,
    schedule: generateWeek(student, { ...mockAnalytics, weekOf: weekStartDate }, mockRules, mockStudentName),
    sourceSnapshotIds: [],
    generationInputs: { student, timezone: TIMEZONE, remainingDays: [], analytics: mockAnalytics },
    policyVersion: "adaptive-weekly-schedule-v3",
  };
}

const basisAt = (now: Date, schedules: PersistedWeeklySchedule[]) =>
  nextWeekBasis({ now, timezone: TIMEZONE, student: mockStudent, schedules, snapshots: [] });

describe("nextWeekBasis", () => {
  it("plans the Monday after the student's current week", () => {
    expect(basisAt(saturday, []).weekOf).toBe("2026-10-05");
    const lateSundayInChicago = new Date("2026-10-05T04:30:00.000Z");
    expect(basisAt(lateSundayInChicago, []).weekOf).toBe("2026-10-05");
  });

  it("knows whether this week's schedule had a practice test", () => {
    expect(basisAt(saturday, [savedWeek("2026-09-28")]).hadPracticeTest).toBe(true);
    const noTest = savedWeek("2026-09-28");
    noTest.schedule.days.SATURDAY = { day: "SATURDAY", type: "unscheduled", activities: [], totalMinutes: 0 };
    expect(basisAt(saturday, [noTest]).hadPracticeTest).toBe(false);
  });

  it("treats a week with no saved schedule as a week with no practice test", () => {
    expect(basisAt(saturday, [savedWeek("2026-09-21")]).hadPracticeTest).toBe(false);
  });

  it("carries a Sunday practice test into next week's review day", () => {
    const sunday = savedWeek("2026-09-28", { ...mockStudent, preferredPracticeTestDay: "SUNDAY" });
    expect(basisAt(saturday, [sunday]).priorWeekPracticeTestReviewMinutes).toBeGreaterThan(0);
    expect(basisAt(saturday, [savedWeek("2026-09-28")]).priorWeekPracticeTestReviewMinutes).toBeUndefined();
  });
});
