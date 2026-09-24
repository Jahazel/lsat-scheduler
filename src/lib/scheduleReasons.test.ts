import { describe, expect, it } from "vitest";
import { DAY_ORDER, generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { DayOfWeek, ScheduleReason, Student } from "./types";

const capacities = (minutes: number) => Object.fromEntries(DAY_ORDER.map((day) => [day, minutes])) as Student["dailyCapacityMinutes"];
const week = (student: Student = mockStudent, options: Parameters<typeof generateWeek>[4] = {}, weekOf = "2026-09-14") =>
  generateWeek(student, { ...mockAnalytics, weekOf }, mockRules, mockStudentName, options);
const reason = (reasons: ScheduleReason[] | undefined, code: ScheduleReason["code"], day?: DayOfWeek) =>
  reasons?.find((item) => item.code === code && (day === undefined
    ? item.placement.scope === "week"
    : item.placement.scope === "day" && item.placement.day === day));

describe("saved schedule reasons", () => {
  it("records overages on minimum, full-section, practice-test, and review days", () => {
    const minimum = week({ ...mockStudent, currentScore: 140, dailyCapacityMinutes: capacities(15) });
    expect(reason(minimum.reasons, "capacity_overage", "MONDAY")?.sentence)
      .toBe("The daily minimum takes 30 min, even though your Monday capacity is 15 min.");
    const full = week({ ...mockStudent, accommodationMultiplier: 2,
      dailyCapacityMinutes: capacities(60) });
    expect(reason(full.reasons, "capacity_overage", "MONDAY")?.sentence).toContain("full section");
    const test = week({ ...mockStudent, dailyCapacityMinutes: capacities(60) });
    expect(reason(test.reasons, "capacity_overage", "SATURDAY")?.sentence).toContain("practice test takes 2 h 30 min");
    expect(reason(test.reasons, "capacity_overage", "SUNDAY")?.sentence).toContain("Practice test review takes 2 h 30 min");
    expect(test.reasons?.filter((item) => item.code === "capacity_overage")
      .every((item) => item.placement.scope === "day")).toBe(true);
  });

  it("records skip reduction with the share and reduced fill limit", () => {
    const schedule = week(mockStudent, { skipReductionPercent: 0.075, skippedShare: 0.3 });
    expect(reason(schedule.reasons, "skip_reduction")?.sentence)
      .toBe("You skipped 30% of last week's planned time, so each drilling day's fill limit is 7.5% lower.");
    expect(reason(week().reasons, "skip_reduction")).toBeUndefined();
  });

  it("groups the starred types sitting out into one reason", () => {
    const schedule = week({ ...mockStudent, currentScore: 140, dailyCapacityMinutes: capacities(15) });
    const sittingOut = mockRules.lrStarredTypes.filter((type) =>
      !DAY_ORDER.some((day) => schedule.days[day].activities.some((activity) =>
        activity.kind === "LR" && !activity.isFullSection && activity.type === type)));
    const rotations = schedule.reasons?.filter((item) => item.code === "starred_rotation") ?? [];
    expect(rotations).toHaveLength(1);
    expect(rotations[0].placement).toEqual({ scope: "week" });
    sittingOut.forEach((type) => expect(rotations[0].sentence).toContain(type));
  });

  it("records the score and capacity reasons for dropping a full section", () => {
    expect(reason(week({ ...mockStudent, currentScore: 149 }).reasons, "full_section_dropped")?.sentence)
      .toContain("149, below 150");
    expect(reason(week({ ...mockStudent, dailyCapacityMinutes: capacities(45) }).reasons, "full_section_dropped")?.sentence)
      .toContain("no remaining drilling day has 60 minutes");
  });

  it("places a moved rest reason on its new day", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "TUESDAY" });
    expect(reason(schedule.reasons, "rest_day_moved", "MONDAY")?.sentence)
      .toBe("Rest day moved to Monday: your practice test review takes Wednesday.");
    const late = week({ ...mockStudent, preferredPracticeTestDay: "WEDNESDAY" }, { createdOn: "THURSDAY" });
    expect(reason(late.reasons, "rest_day_moved", "TUESDAY")?.sentence)
      .toBe("Rest day moved to Tuesday: Wednesday was reserved for practice test.");
  });

  it("records a missed practice test with its next date", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "TUESDAY" }, { createdOn: "THURSDAY" });
    expect(reason(schedule.reasons, "no_practice_test")?.sentence)
      .toBe("No practice test this week; your next one is September 22.");
  });

  it("records near-test weeks and both sides of a Sunday review handoff", () => {
    const near = week({ ...mockStudent, goalTestDate: "2026-10-01" });
    expect(reason(near.reasons, "near_test_week")?.sentence).toContain("2 LawHub practice tests");
    const sunday = week({ ...mockStudent, preferredPracticeTestDay: "SUNDAY" });
    expect(reason(sunday.reasons, "sunday_review_next_monday", "SUNDAY")?.sentence)
      .toBe("Review is next Monday, in next week's plan.");
    const next = week(mockStudent, { priorWeekPracticeTestReviewMinutes: 150 }, "2026-09-21");
    expect(reason(next.reasons, "review_carried_over", "MONDAY")?.sentence)
      .toBe("Review for last Sunday's practice test (September 20).");
  });

  it("does not invent reasons for the drilling ratio or LR focus", () => {
    const codes = new Set(week().reasons?.map((item) => item.code));
    expect(codes.has("drilling_ratio" as ScheduleReason["code"])).toBe(false);
    expect(codes.has("lr_focus" as ScheduleReason["code"])).toBe(false);
  });
});
