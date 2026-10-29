import { describe, expect, it } from "vitest";
import { listPastWeekMonths, resolveProgressRoute } from "./progressHistory";
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

describe("resolveProgressRoute", () => {
  const history = [saved("2026-08-03"), saved("2026-08-10", 3), saved("2026-08-24"), saved("2026-08-31"), saved("2026-09-07")];
  const route = (requestedWeek: string | undefined, schedules = history) =>
    resolveProgressRoute({ schedules, checkIns: [], currentWeekStartDate: "2026-09-07", requestedWeek });
  const neighbors = (requestedWeek: string, schedules = history) => {
    const resolved = route(requestedWeek, schedules);
    if (resolved.kind !== "week") throw new Error(`expected a week, got ${resolved.kind}`);
    return { week: resolved.week.label, older: resolved.older?.label, newer: resolved.newer?.label };
  };

  it("gives a middle week both neighbors", () => {
    expect(neighbors("2026-08-24")).toEqual({ week: "Aug 24 – 30", older: "Aug 10 – 16", newer: "Aug 31 – Sep 6" });
  });

  it("steps over a skipped week each way", () => {
    expect(neighbors("2026-08-24").older).toBe("Aug 10 – 16");
    expect(neighbors("2026-08-10").newer).toBe("Aug 24 – 30");
  });

  it("gives the newest past week no newer week, even when This week has a schedule", () => {
    expect(neighbors("2026-08-31")).toEqual({ week: "Aug 31 – Sep 6", older: "Aug 24 – 30", newer: undefined });
  });

  it("gives the oldest week no older week", () => {
    expect(neighbors("2026-08-03")).toEqual({ week: "Aug 3 – 9", older: undefined, newer: "Aug 10 – 16" });
  });

  it("gives the only past week neither neighbor", () => {
    expect(neighbors("2026-08-31", [saved("2026-08-31"), saved("2026-09-07")])).toEqual({ week: "Aug 31 – Sep 6", older: undefined, newer: undefined });
  });

  it("carries each neighbor's done count", () => {
    const resolved = resolveProgressRoute({
      schedules: history,
      checkIns: checkIns("2026-08-10", ["completed", "completed", "not_started"]),
      currentWeekStartDate: "2026-09-07",
      requestedWeek: "2026-08-24",
    });
    expect(resolved.kind === "week" && resolved.older).toMatchObject({ weekStartDate: "2026-08-10", done: 2, total: 3 });
  });

  it("gives the requested week its own schedule and check-ins", () => {
    const resolved = resolveProgressRoute({
      schedules: history,
      checkIns: [...checkIns("2026-08-24", ["completed"]), ...checkIns("2026-08-10", ["completed"])],
      currentWeekStartDate: "2026-09-07",
      requestedWeek: "2026-08-24",
    });
    if (resolved.kind !== "week") throw new Error(`expected a week, got ${resolved.kind}`);
    expect(resolved.schedule.id).toBe("schedule-2026-08-24");
    expect(resolved.checkIns.map((checkIn) => checkIn.scheduleId)).toEqual(["schedule-2026-08-24"]);
    expect(resolved.week).toMatchObject({ done: 1, total: 2 });
  });

  it("sends the current week to This week", () => {
    expect(route("2026-09-07")).toEqual({ kind: "this_week" });
  });

  it.each([
    ["no week", undefined],
    ["a skipped week", "2026-08-17"],
    ["a week before the first schedule", "2026-01-05"],
    ["a later week", "2026-09-14"],
    ["text that is not a date", "soon"],
  ])("opens the list for %s", (_, requestedWeek) => {
    const resolved = route(requestedWeek);
    expect(resolved.kind).toBe("list");
    expect(resolved.kind === "list" && resolved.months.map((month) => month.month)).toEqual(["August 2026"]);
  });
});
