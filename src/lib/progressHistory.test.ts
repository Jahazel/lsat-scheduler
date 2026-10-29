import { describe, expect, it } from "vitest";
import { listPastWeekMonths } from "./progressHistory";
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

const saved = (weekStartDate: string, activityCount = 2) => ({
  id: `schedule-${weekStartDate}`,
  weekStartDate,
  schedule: schedule(weekStartDate, activityCount),
});

function checkIns(weekStartDate: string, statuses: ActivityCheckIn["status"][]): ActivityCheckIn[] {
  return statuses.map((status, index) => ({ scheduleId: `schedule-${weekStartDate}`, activityId: `MONDAY:${index}`, status }));
}

const shape = (months: ReturnType<typeof listPastWeekMonths>) =>
  months.map((month) => ({ month: month.month, weeks: month.weeks.map((week) => week.label) }));

describe("listPastWeekMonths", () => {
  it("groups past weeks into months newest first and leaves out the current week", () => {
    const months = listPastWeekMonths({
      schedules: [saved("2026-09-07"), saved("2026-10-26"), saved("2026-10-12"), saved("2026-09-21"), saved("2026-10-19")],
      checkIns: [],
      currentWeekStartDate: "2026-10-26",
    });

    expect(shape(months)).toEqual([
      { month: "October 2026", weeks: ["Oct 19 – 25", "Oct 12 – 18"] },
      { month: "September 2026", weeks: ["Sep 21 – 27", "Sep 7 – 13"] },
    ]);
  });

  it("gives a skipped week no row", () => {
    const months = listPastWeekMonths({
      schedules: [saved("2026-10-19"), saved("2026-10-05")],
      checkIns: [],
      currentWeekStartDate: "2026-10-26",
    });

    expect(shape(months)).toEqual([{ month: "October 2026", weeks: ["Oct 19 – 25", "Oct 5 – 11"] }]);
  });

  it("counts done activities from the week's own check-ins", () => {
    const months = listPastWeekMonths({
      schedules: [saved("2026-10-19", 3), saved("2026-10-12", 4), saved("2026-10-05", 2), saved("2026-09-28", 0)],
      checkIns: [
        ...checkIns("2026-10-19", ["completed", "completed", "completed"]),
        ...checkIns("2026-10-12", ["completed", "not_started", "completed"]),
        { scheduleId: "schedule-2026-10-05", activityId: "TUESDAY:0", status: "completed" },
      ],
      currentWeekStartDate: "2026-10-26",
    });

    expect(months.flatMap((month) => month.weeks.map(({ done, total, completionPercent }) => ({ done, total, completionPercent })))).toEqual([
      { done: 3, total: 3, completionPercent: 100 },
      { done: 2, total: 4, completionPercent: 50 },
      { done: 0, total: 2, completionPercent: 0 },
      { done: 0, total: 0, completionPercent: 0 },
    ]);
  });

  it("files a week that crosses months under its Monday's month and labels it Monday to Sunday", () => {
    const startedThursday = { ...saved("2026-09-28"), schedule: schedule("2026-10-01") };
    const months = listPastWeekMonths({
      schedules: [startedThursday, saved("2026-12-28")],
      checkIns: [],
      currentWeekStartDate: "2027-01-04",
    });

    expect(shape(months)).toEqual([
      { month: "December 2026", weeks: ["Dec 28 – Jan 3"] },
      { month: "September 2026", weeks: ["Sep 28 – Oct 4"] },
    ]);
  });
});
