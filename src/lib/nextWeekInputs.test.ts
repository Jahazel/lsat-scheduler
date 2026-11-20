import { describe, expect, it } from "vitest";
import { generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent } from "./mockData";
import { nextWeekHistory, weightedTrend } from "./nextWeekInputs";
import type { DayOfWeek } from "./types";

const week = (weekStartDate: string, preferredPracticeTestDay: DayOfWeek = "SATURDAY") => ({
  weekStartDate,
  schedule: generateWeek({ ...mockStudent, preferredPracticeTestDay }, { ...mockAnalytics, weekOf: weekStartDate }, mockRules, "Student"),
});

describe("nextWeekHistory", () => {
  it("carries last week's Sunday practice test into the review minutes", () => {
    const lastWeek = week("2026-09-28", "SUNDAY");
    const sundayTest = lastWeek.schedule.days.SUNDAY.activities.find((activity) => activity.kind === "PT");
    expect(sundayTest?.minutes).toBeGreaterThan(0);
    expect(nextWeekHistory("2026-10-05", [lastWeek]).priorWeekPracticeTestReviewMinutes).toBe(sundayTest?.minutes);
  });

  it("carries nothing when last week's practice test was not on Sunday", () => {
    expect(nextWeekHistory("2026-10-05", [week("2026-09-28")]).priorWeekPracticeTestReviewMinutes).toBeUndefined();
  });

  it("carries nothing from a Sunday test two weeks back", () => {
    expect(nextWeekHistory("2026-10-05", [week("2026-09-21", "SUNDAY")]).priorWeekPracticeTestReviewMinutes).toBeUndefined();
  });

  it("uses only weeks before the planned week as history, in the order given", () => {
    const saved = [week("2026-09-28"), week("2026-10-05"), week("2026-09-21"), week("2026-10-12")];
    expect(nextWeekHistory("2026-10-05", saved).priorSchedules.map((schedule) => schedule.weekOf))
      .toEqual(["2026-09-28", "2026-09-21"]);
  });
});

describe("weightedTrend", () => {
  it("weights the 3 newest reads 0.6, 0.3, and 0.1 and ignores older reads", () => {
    const read = (accuracy: number) => ({ ...mockAnalytics, lrAccuracyByType: { Evaluate: accuracy } });
    const trend = weightedTrend([read(1), read(0.5), read(0), read(0.2)], "2026-10-05");
    expect(trend.weekOf).toBe("2026-10-05");
    expect(trend.lrAccuracyByType.Evaluate).toBeCloseTo(0.75);
  });
});
