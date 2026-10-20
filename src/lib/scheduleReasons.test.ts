import { describe, expect, it } from "vitest";
import { DAY_ORDER, generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import { SCHEDULE_REASON_CODES } from "./types";
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

  it("records skip reduction with the share and reduced daily capacity", () => {
    const schedule = week(mockStudent, { skipReductionPercent: 0.075, skipShare: 0.3 });
    expect(reason(schedule.reasons, "skip_reduction")?.sentence)
      .toBe("You skipped 30% last week; skip reduction sets each drilling day's fill limit 8% below daily capacity.");
    const rounded = reason(week(mockStudent, { skipReductionPercent: 0.083325, skipShare: 1 / 3 }).reasons,
      "skip_reduction")?.sentence;
    expect(rounded).toBe("You skipped 33% last week; skip reduction sets each drilling day's fill limit 8% below daily capacity.");
    expect(rounded?.split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(reason(week().reasons, "skip_reduction")).toBeUndefined();
  });

  it("keeps a small skip reduction visible in its saved sentence", () => {
    const sentence = reason(week(mockStudent, { skipReductionPercent: 0.003125, skipShare: 0.0125 }).reasons,
      "skip_reduction")?.sentence;
    expect(sentence).toBe("You skipped 1% last week; skip reduction sets each drilling day's fill limit 0.3% below daily capacity.");
    expect(sentence?.split(/\s+/).length).toBeLessThanOrEqual(20);
    const smaller = reason(week(mockStudent, { skipReductionPercent: 0.001, skipShare: 0.004 }).reasons,
      "skip_reduction")?.sentence;
    expect(smaller).toBe("You skipped 0.4% last week; skip reduction sets each drilling day's fill limit 0.1% below daily capacity.");
    expect(smaller?.split(/\s+/).length).toBeLessThanOrEqual(20);
  });

  it("groups the starred types sitting out into one reason", () => {
    const schedule = week({ ...mockStudent, currentScore: 140, dailyCapacityMinutes: capacities(15) });
    const sittingOut = mockRules.lrStarredTypes.filter((type) =>
      !DAY_ORDER.some((day) => schedule.days[day].activities.some((activity) =>
        activity.kind === "LR" && !activity.isFullSection && activity.types.includes(type))));
    const rotations = schedule.reasons?.filter((item) => item.code === "starred_rotation") ?? [];
    expect(rotations).toHaveLength(1);
    expect(rotations[0].placement).toEqual({ scope: "week" });
    sittingOut.forEach((type) => expect(rotations[0].sentence).toContain(type));
  });

  it("does not claim a starred rotation when no drilling day remains", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "SUNDAY",
      dailyCapacityMinutes: capacities(90) }, { createdOn: "SUNDAY" });
    expect(reason(schedule.reasons, "starred_rotation")).toBeUndefined();
  });

  it("does not claim a starred rotation when the only drilling day holds a full section", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "SUNDAY",
      dailyCapacityMinutes: { ...capacities(90), SATURDAY: 60 } }, { createdOn: "SATURDAY" });
    expect(schedule.days.SATURDAY.activities.some((activity) =>
      (activity.kind === "LR" || activity.kind === "RC") && activity.isFullSection)).toBe(true);
    expect(reason(schedule.reasons, "starred_rotation")).toBeUndefined();
  });

  it("records the score and capacity reasons for dropping a full section", () => {
    expect(reason(week({ ...mockStudent, currentScore: 149 }).reasons, "full_section_dropped")?.sentence)
      .toContain("149, below 150");
    expect(reason(week({ ...mockStudent, dailyCapacityMinutes: capacities(45) }).reasons, "full_section_dropped")?.sentence)
      .toContain("no remaining drilling day has 60 minutes");
  });

  it("says a full section was dropped because no drilling day remains", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "SUNDAY",
      dailyCapacityMinutes: capacities(90) }, { createdOn: "SUNDAY" });
    const sentence = reason(schedule.reasons, "full_section_dropped")?.sentence;
    expect(sentence).toBe("No full section this week: no drilling day remains.");
    expect(sentence?.split(/\s+/).length).toBeLessThanOrEqual(20);
  });

  it("records the score cause when no drilling day remains", () => {
    const schedule = week({ ...mockStudent, currentScore: 149, preferredPracticeTestDay: "SUNDAY",
      dailyCapacityMinutes: capacities(90) }, { createdOn: "SUNDAY" });
    const sentence = reason(schedule.reasons, "full_section_dropped")?.sentence;
    expect(sentence).toBe("No full section this week: your current score is 149, below 150.");
    expect(sentence?.split(/\s+/).length).toBeLessThanOrEqual(20);
  });

  it("places a moved rest reason on its new day", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "TUESDAY" });
    expect(reason(schedule.reasons, "rest_day_moved", "MONDAY")?.sentence)
      .toBe("Rest day moved to Monday: your practice test review takes Wednesday.");
    const late = week({ ...mockStudent, preferredPracticeTestDay: "WEDNESDAY" }, { createdOn: "THURSDAY" });
    expect(reason(late.reasons, "rest_day_moved", "TUESDAY")?.sentence)
      .toBe("Rest day moved to Tuesday: Wednesday was reserved for a practice test.");
    const fallback = generateWeek({ ...mockStudent, preferredPracticeTestDay: "TUESDAY" }, mockAnalytics,
      { ...mockRules, restDay: "FRIDAY" }, mockStudentName);
    expect(reason(fallback.reasons, "rest_day_moved", "MONDAY")?.sentence)
      .toBe("Rest day moved to Monday to fit this week's practice tests and reviews.");
  });

  it("records a missed practice test with its next date", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "TUESDAY" }, { createdOn: "THURSDAY" });
    expect(reason(schedule.reasons, "no_practice_test")?.sentence)
      .toBe("No practice test this week; your next one is September 22.");
  });

  it("names next week's earlier near-test practice test", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "THURSDAY",
      goalTestDate: "2026-10-26" }, { createdOn: "FRIDAY" }, "2026-09-21");
    expect(reason(schedule.reasons, "no_practice_test")?.sentence)
      .toBe("No practice test this week; your next one is September 28.");
  });

  it("does not promise a practice test on or after the goal test date", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "THURSDAY",
      goalTestDate: "2026-09-28" }, { createdOn: "FRIDAY" }, "2026-09-21");
    expect(reason(schedule.reasons, "no_practice_test")?.sentence)
      .toBe("No practice test this week.");
  });

  it("records near-test weeks and both sides of a Sunday review handoff", () => {
    const near = week({ ...mockStudent, goalTestDate: "2026-10-01" });
    expect(reason(near.reasons, "near_test_week")?.sentence)
      .toBe("This near-test week has 2 LawHub practice tests before your October 1 test.");
    const sunday = week({ ...mockStudent, preferredPracticeTestDay: "SUNDAY" });
    expect(reason(sunday.reasons, "practice_test_review_day_next_week", "SUNDAY")?.sentence)
      .toBe("The practice-test review day is next Monday in the next weekly schedule.");
    const next = week(mockStudent, { priorWeekPracticeTestReviewMinutes: 150 }, "2026-09-21");
    expect(reason(next.reasons, "review_carried_over", "MONDAY")?.sentence)
      .toBe("Review for last Sunday's practice test (September 20).");
  });

  it("does not say both near-test practice tests precede the goal test when one does not", () => {
    const schedule = week({ ...mockStudent, preferredPracticeTestDay: "SATURDAY",
      goalTestDate: "2026-09-16" });
    expect(schedule.days.WEDNESDAY.type).toBe("practice_test");
    expect(schedule.days.SATURDAY.type).toBe("practice_test");
    expect(reason(schedule.reasons, "near_test_week")?.sentence)
      .toBe("This near-test week has 2 LawHub practice tests.");
  });

  it("does not invent reasons for the drilling ratio or LR focus", () => {
    const allowedCodes = new Set<string>(SCHEDULE_REASON_CODES);
    const schedules = [week(), week({ ...mockStudent, goalTestDate: "2026-10-01" }),
      week({ ...mockStudent, currentScore: 140, dailyCapacityMinutes: capacities(15) })];
    const codes = schedules.flatMap((schedule) => schedule.reasons?.map((item) => item.code) ?? []);
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every((code) => allowedCodes.has(code))).toBe(true);
    expect(codes).not.toContain("drilling_ratio");
    expect(codes).not.toContain("lr_focus");
  });
});
