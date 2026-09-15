import { describe, expect, it } from "vitest";
import { formatScheduleWeekOf, remainingActivityCount, scheduledActivityCount } from "./scheduleCheckInSummary";
import type { ActivityCheckIn, WeeklySchedule } from "./types";

const schedule = {
  studentName: "Ada",
  weekOf: "2026-09-14",
  days: {
    MONDAY: { day: "MONDAY", type: "drill", activities: [{ kind: "lr", focus: "strengthen" }], totalMinutes: 30 },
    TUESDAY: { day: "TUESDAY", type: "rest", activities: [], totalMinutes: 0 },
    WEDNESDAY: { day: "WEDNESDAY", type: "drill", activities: [{ kind: "rc", focus: "passage" }, { kind: "review", focus: "errors" }], totalMinutes: 60 },
    THURSDAY: { day: "THURSDAY", type: "rest", activities: [], totalMinutes: 0 },
    FRIDAY: { day: "FRIDAY", type: "drill", activities: [{ kind: "lr", focus: "flaw" }], totalMinutes: 30 },
    SATURDAY: { day: "SATURDAY", type: "rest", activities: [], totalMinutes: 0 },
    SUNDAY: { day: "SUNDAY", type: "rest", activities: [], totalMinutes: 0 },
  },
} as unknown as WeeklySchedule;

describe("schedule check-in summary", () => {
  it("formats the week start date for the schedule eyebrow", () => {
    expect(formatScheduleWeekOf("2026-09-14")).toBe("September 14");
  });

  it("counts scheduled activities and leaves missing check-ins remaining", () => {
    const checkIns: ActivityCheckIn[] = [
      { scheduleId: "schedule-1", activityId: "MONDAY:0", status: "completed" },
      { scheduleId: "schedule-1", activityId: "WEDNESDAY:0", status: "skipped" },
    ];

    expect(scheduledActivityCount(schedule)).toBe(4);
    expect(remainingActivityCount(schedule, checkIns)).toBe(2);
  });

  it("does not count completed or skipped activities as remaining", () => {
    const checkIns: ActivityCheckIn[] = [
      { scheduleId: "schedule-1", activityId: "MONDAY:0", status: "completed" },
      { scheduleId: "schedule-1", activityId: "WEDNESDAY:0", status: "skipped" },
      { scheduleId: "schedule-1", activityId: "WEDNESDAY:1", status: "not_started" },
      { scheduleId: "schedule-1", activityId: "FRIDAY:0", status: "completed" },
    ];

    expect(remainingActivityCount(schedule, checkIns)).toBe(1);
  });
});
