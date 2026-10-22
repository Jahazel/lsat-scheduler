import { describe, expect, it } from "vitest";
import { generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { PersistedWeeklySchedule, Student } from "./types";
import { previewPlannedWeek, weekSummary, weekTiles, weeklyUploadBasis } from "./weeklyUpload";

const TIMEZONE = "America/Chicago";
const saturday = new Date("2026-10-03T15:00:00.000Z");
const wednesday = new Date("2026-10-07T15:00:00.000Z");

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
  weeklyUploadBasis({ now, timezone: TIMEZONE, student: mockStudent, schedules, snapshots: [] });

describe("weeklyUploadBasis", () => {
  it("plans the Monday after the student's current week from Saturday, starting Monday", () => {
    expect(basisAt(saturday, [])).toMatchObject({ weekOf: "2026-10-05", startsOn: "MONDAY" });
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

  it("keeps the 2 newest approved snapshots, breaking a tie by id", () => {
    const snapshot = (id: string, approvedAt: string) => ({ ...mockAnalytics, id, approvedAt });
    const snapshots = [
      snapshot("old", "2026-09-20T12:00:00.000Z"),
      snapshot("tie-b", "2026-09-27T12:00:00.000Z"),
      snapshot("tie-a", "2026-09-27T12:00:00.000Z"),
    ];
    const basis = weeklyUploadBasis({ now: saturday, timezone: TIMEZONE, student: mockStudent, schedules: [], snapshots });
    expect(basis.priorSnapshots.map(({ id }) => id)).toEqual(["tie-a", "tie-b"]);
  });

  it("carries a Sunday practice test into next week's review day", () => {
    const sunday = savedWeek("2026-09-28", { ...mockStudent, preferredPracticeTestDay: "SUNDAY" });
    expect(basisAt(saturday, [sunday]).priorWeekPracticeTestReviewMinutes).toBeGreaterThan(0);
    expect(basisAt(saturday, [savedWeek("2026-09-28")]).priorWeekPracticeTestReviewMinutes).toBeUndefined();
  });

  it("plans the rest of the current week from Monday to Friday, starting today", () => {
    expect(basisAt(wednesday, [])).toMatchObject({ weekOf: "2026-10-05", startsOn: "WEDNESDAY" });
    const mondayInChicago = new Date("2026-10-05T05:30:00.000Z");
    expect(basisAt(mondayInChicago, [])).toMatchObject({ weekOf: "2026-10-05", startsOn: "MONDAY" });
  });

  it("on a weekday, asks for last week's practice test and carries last week's Sunday test", () => {
    expect(basisAt(wednesday, [savedWeek("2026-09-28")]).hadPracticeTest).toBe(true);
    expect(basisAt(wednesday, [savedWeek("2026-09-21")]).hadPracticeTest).toBe(false);
    const sunday = savedWeek("2026-09-28", { ...mockStudent, preferredPracticeTestDay: "SUNDAY" });
    expect(basisAt(wednesday, [sunday]).priorWeekPracticeTestReviewMinutes).toBeGreaterThan(0);
  });
});

describe("previewPlannedWeek", () => {
  const preview = (now: Date) => previewPlannedWeek(basisAt(now, []), { ...mockAnalytics, weekOf: "2026-10-05" }, 150);

  it("on a weekday, leaves the days before today unscheduled and shows only today to Sunday", () => {
    const schedule = preview(wednesday);
    expect(["MONDAY", "TUESDAY"].map((day) => schedule.days[day as "MONDAY"].activities)).toEqual([[], []]);
    expect(["WEDNESDAY", "THURSDAY", "FRIDAY"].some((day) => schedule.days[day as "MONDAY"].activities.length > 0)).toBe(true);
    expect(weekTiles(schedule, "WEDNESDAY").map(({ label }) => label)).toEqual(["Wed 7", "Thu 8", "Fri 9", "Sat 10", "Sun 11"]);
    expect(weekSummary(schedule, "WEDNESDAY")).toMatch(/^Oct 7–11 · /);
  });

  it("from Saturday, previews all seven days of next week", () => {
    const schedule = preview(saturday);
    expect(weekTiles(schedule, "MONDAY")).toHaveLength(7);
    expect(weekSummary(schedule, "MONDAY")).toMatch(/^Oct 5–11 · /);
  });
});
