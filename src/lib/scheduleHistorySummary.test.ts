import { describe, expect, it } from "vitest";
import { summarizeHistoryStats, summarizeScheduleHistoryWeek } from "./scheduleHistorySummary";
import type { ActivityCheckIn, WeeklySchedule } from "./types";

function schedule(weekOf: string, activityCount = 2): WeeklySchedule {
  return {
    studentName: "Ada",
    weekOf,
    days: {
      MONDAY: {
        day: "MONDAY",
        type: activityCount === 0 ? "rest" : "drill",
        activities: Array.from({ length: activityCount }, () => ({ kind: "REVIEW", label: "Review", minutes: 30 })),
        totalMinutes: activityCount * 30,
      },
      TUESDAY: { day: "TUESDAY", type: "rest", activities: [], totalMinutes: 0 },
      WEDNESDAY: { day: "WEDNESDAY", type: "rest", activities: [], totalMinutes: 0 },
      THURSDAY: { day: "THURSDAY", type: "rest", activities: [], totalMinutes: 0 },
      FRIDAY: { day: "FRIDAY", type: "rest", activities: [], totalMinutes: 0 },
      SATURDAY: { day: "SATURDAY", type: "rest", activities: [], totalMinutes: 0 },
      SUNDAY: { day: "SUNDAY", type: "rest", activities: [], totalMinutes: 0 },
    },
  };
}

function checkIns(scheduleId: string, statuses: ActivityCheckIn["status"][]): ActivityCheckIn[] {
  return statuses.map((status, index) => ({ scheduleId, activityId: `MONDAY:${index}`, status }));
}

describe("schedule history summary", () => {
  it("summarizes an empty week without dividing by zero", () => {
    expect(summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-14",
      schedule: schedule("2026-09-14", 0),
      checkIns: [],
      isCurrent: false,
    })).toMatchObject({ total: 0, done: 0, skipped: 0, plannedMinutes: 0, completionPercent: 0 });
  });

  it("counts only a consecutive 80% completion streak from the most recent past week", () => {
    const weeks = [
      summarizeScheduleHistoryWeek({ weekStartDate: "2026-09-21", schedule: schedule("2026-09-21", 5), checkIns: checkIns("newest", ["completed", "completed", "completed", "completed", "skipped"]), isCurrent: false }),
      summarizeScheduleHistoryWeek({ weekStartDate: "2026-09-14", schedule: schedule("2026-09-14", 5), checkIns: checkIns("middle", ["completed", "completed", "completed"]), isCurrent: false }),
      summarizeScheduleHistoryWeek({ weekStartDate: "2026-09-07", schedule: schedule("2026-09-07", 5), checkIns: checkIns("oldest", ["completed", "completed", "completed", "completed", "completed"]), isCurrent: false }),
    ];

    expect(summarizeHistoryStats([weeks[2], weeks[0], weeks[1]]).streakWeeks).toBe(1);
  });

  it("does not round a 79.6% week up into the 80% streak", () => {
    const newest = summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-21",
      schedule: schedule("2026-09-21", 250),
      checkIns: checkIns("newest", [...Array(199).fill("completed"), ...Array(51).fill("skipped")]),
      isCurrent: false,
    });

    expect(newest.completionPercent).toBe(80);
    expect(summarizeHistoryStats([newest]).streakWeeks).toBe(0);
  });

  it("reports no streak when there are no past weeks", () => {
    const current = summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-21",
      schedule: schedule("2026-09-21"),
      checkIns: checkIns("current", ["completed", "completed"]),
      isCurrent: true,
    });

    expect(summarizeHistoryStats([current]).streakWeeks).toBeNull();
  });

  it("includes every week in planned hours, including the current week", () => {
    const past = summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-14",
      schedule: schedule("2026-09-14", 2),
      checkIns: [],
      isCurrent: false,
    });
    const current = summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-21",
      schedule: schedule("2026-09-21", 3),
      checkIns: [],
      isCurrent: true,
    });

    expect(summarizeHistoryStats([past, current]).plannedMinutes).toBe(150);
  });

  it("uses the most recent past week when best-week completion ties", () => {
    const oldest = summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-07",
      schedule: schedule("2026-09-07"),
      checkIns: checkIns("oldest", ["completed", "completed"]),
      isCurrent: false,
    });
    const newestTied = summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-14",
      schedule: schedule("2026-09-14"),
      checkIns: checkIns("newest-tied", ["completed", "completed"]),
      isCurrent: false,
    });
    const current = summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-21",
      schedule: schedule("2026-09-21"),
      checkIns: checkIns("current", ["completed", "completed"]),
      isCurrent: true,
    });

    expect(summarizeHistoryStats([oldest, current, newestTied]).bestWeek).toEqual({
      weekStartDate: "2026-09-14",
      completionPercent: 100,
    });
  });

  it("excludes the current week from completion statistics", () => {
    const past = summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-14",
      schedule: schedule("2026-09-14"),
      checkIns: checkIns("past", ["completed", "skipped"]),
      isCurrent: false,
    });
    const current = summarizeScheduleHistoryWeek({
      weekStartDate: "2026-09-21",
      schedule: schedule("2026-09-21"),
      checkIns: checkIns("current", ["completed", "completed"]),
      isCurrent: true,
    });

    expect(summarizeHistoryStats([current, past])).toEqual({
      averageDonePercent: 50,
      streakWeeks: 0,
      plannedMinutes: 120,
      pastWeekCount: 1,
      bestWeek: { weekStartDate: "2026-09-14", completionPercent: 50 },
    });
  });
});
