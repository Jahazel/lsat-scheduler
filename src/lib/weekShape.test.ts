import { describe, expect, it } from "vitest";
import { DAY_ORDER, generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { DayOfWeek, DayPlan } from "./types";

const onePracticeTest: Record<DayOfWeek, string> = {
  MONDAY: "practice_test review rest drill drill drill drill",
  TUESDAY: "rest practice_test review drill drill drill drill",
  WEDNESDAY: "drill rest practice_test review drill drill drill",
  THURSDAY: "drill drill rest practice_test review drill drill",
  FRIDAY: "drill drill rest drill practice_test review drill",
  SATURDAY: "drill drill rest drill drill practice_test review",
  SUNDAY: "drill drill rest drill drill drill practice_test",
};

const nearTestWeek: Record<DayOfWeek, string> = {
  MONDAY: "practice_test review rest practice_test review drill drill",
  TUESDAY: "rest practice_test review drill practice_test review drill",
  WEDNESDAY: "drill rest practice_test review drill practice_test review",
  THURSDAY: "practice_test review rest practice_test review drill drill",
  FRIDAY: "rest practice_test review drill practice_test review drill",
  SATURDAY: "drill rest practice_test review drill practice_test review",
  SUNDAY: "drill drill rest practice_test review drill practice_test",
};

const withPriorWeekPracticeTestReview: Record<DayOfWeek, string> = {
  MONDAY: "review practice_test review rest drill drill drill",
  TUESDAY: "review practice_test review rest drill drill drill",
  WEDNESDAY: "review rest practice_test review drill drill drill",
  THURSDAY: "review drill rest practice_test review drill drill",
  FRIDAY: "review drill rest drill practice_test review drill",
  SATURDAY: "review drill rest drill drill practice_test review",
  SUNDAY: "review drill rest drill drill drill practice_test",
};

const nearTestWeekWithPriorWeekPracticeTestReview: Record<DayOfWeek, string> = {
  MONDAY: "review practice_test review rest practice_test review drill",
  TUESDAY: "review practice_test review rest practice_test review drill",
  WEDNESDAY: "review rest practice_test review drill practice_test review",
  THURSDAY: "review drill rest practice_test review drill drill",
  FRIDAY: "review practice_test review rest practice_test review drill",
  SATURDAY: "review rest practice_test review drill practice_test review",
  SUNDAY: "review drill rest practice_test review drill practice_test",
};

const nearTestWeekCreatedOnPreferredDay: Record<DayOfWeek, string> = {
  MONDAY: "practice_test review rest practice_test review drill drill",
  TUESDAY: "rest practice_test review drill practice_test review drill",
  WEDNESDAY: "drill rest practice_test review drill practice_test review",
  THURSDAY: "drill drill rest practice_test review drill drill",
  FRIDAY: "rest drill drill drill practice_test review drill",
  SATURDAY: "drill rest drill drill drill practice_test review",
  SUNDAY: "drill drill rest drill drill drill practice_test",
};

function types(days: Record<DayOfWeek, DayPlan>) {
  return DAY_ORDER.map((day) => days[day].type).join(" ");
}

describe("weekly shape", () => {
  for (const preferred of DAY_ORDER) {
    it(`places a one-practice-test week for ${preferred}`, () => {
      const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: preferred },
        { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName);
      expect(types(schedule.days)).toBe(onePracticeTest[preferred]);
      for (const day of DAY_ORDER) {
        const plan = schedule.days[day];
        if (plan.type === "review") {
          expect(plan.activities).toHaveLength(1);
          expect(plan.totalMinutes).toBe(150);
        }
      }
    });

    it(`places a near-test week for ${preferred}`, () => {
      const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: preferred, goalTestDate: "2026-10-01" },
        { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName);
      expect(types(schedule.days)).toBe(nearTestWeek[preferred]);
      expect(DAY_ORDER.flatMap((day) => schedule.days[day].activities)
        .filter((activity) => activity.kind === "PT")
        .map((activity) => activity.label)).toEqual(["LawHub Practice Test", "LawHub Practice Test"]);
    });

    it(`keeps a prior-week practice-test review day on Monday for ${preferred}`, () => {
      const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: preferred },
        { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName,
        { priorWeekPracticeTestReviewMinutes: 187.5 });
      expect(types(schedule.days)).toBe(withPriorWeekPracticeTestReview[preferred]);
      expect(schedule.days.MONDAY.type).toBe("review");
      expect(schedule.days.MONDAY.activities).toEqual([
        { kind: "REVIEW", label: "PT Review + Blind Review", minutes: 187.5 },
      ]);
    });

    it(`omits the practice test and its review day when a one-practice-test week is created after ${preferred}`, () => {
      const preferredIndex = DAY_ORDER.indexOf(preferred);
      if (preferredIndex === 6) return;
      const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: preferred },
        { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName,
        { createdOn: DAY_ORDER[preferredIndex + 1] });
      const expected = onePracticeTest[preferred].split(" ").map((type) => (type === "rest" ? "rest" : "drill")).join(" ");
      expect(types(schedule.days)).toBe(expected);
    });

    it(`keeps the preferred practice test when created on ${preferred}`, () => {
      const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: preferred },
        { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName,
        { createdOn: preferred });
      expect(schedule.days[preferred].type).toBe("practice_test");
    });
  }

  it.each(DAY_ORDER)("places a near-test week with a prior-week practice-test review day for %s", (preferred) => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: preferred, goalTestDate: "2026-10-01" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName,
      { priorWeekPracticeTestReviewMinutes: 150 });
    expect(types(schedule.days)).toBe(nearTestWeekWithPriorWeekPracticeTestReview[preferred]);
    expect(schedule.days.MONDAY.activities).toEqual([
      { kind: "REVIEW", label: "PT Review + Blind Review", minutes: 150 },
    ]);
  });

  it.each([
    ["MONDAY", "TUESDAY", "drill drill rest drill drill drill drill"],
    ["TUESDAY", "WEDNESDAY", "rest drill drill drill drill drill drill"],
    ["WEDNESDAY", "THURSDAY", "drill rest drill drill drill drill drill"],
    ["THURSDAY", "TUESDAY", "drill drill rest practice_test review drill drill"],
    ["FRIDAY", "WEDNESDAY", "rest drill drill drill practice_test review drill"],
    ["SATURDAY", "THURSDAY", "drill rest drill drill drill practice_test review"],
    ["SUNDAY", "FRIDAY", "drill drill rest drill drill drill practice_test"],
  ] as const)("places a near-test week for %s when created late on %s", (preferred, createdOn, expected) => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: preferred, goalTestDate: "2026-10-01" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName, { createdOn });
    expect(types(schedule.days)).toBe(expected);
  });

  it.each(DAY_ORDER)("keeps the preferred practice test in a near-test week created on %s", (preferred) => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: preferred, goalTestDate: "2026-10-01" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName, { createdOn: preferred });
    expect(types(schedule.days)).toBe(nearTestWeekCreatedOnPreferredDay[preferred]);
    expect(schedule.days[preferred].type).toBe("practice_test");
  });

  it.each([1, 1.5, 2] as const)("uses accommodation-adjusted review minutes at %s time", (accommodationMultiplier) => {
    const schedule = generateWeek({ ...mockStudent, accommodationMultiplier },
      { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName);
    expect(schedule.days.SUNDAY.totalMinutes).toBe(
      150 * mockRules.accommodationTimeMultiplier[accommodationMultiplier]
    );
  });

  it("records overage on the preferred practice-test day and its review day", () => {
    const student = {
      ...mockStudent,
      preferredPracticeTestDay: "TUESDAY" as const,
      dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, TUESDAY: 60, WEDNESDAY: 45 },
    };
    const schedule = generateWeek(student, { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName);
    expect(schedule.days.TUESDAY.capacityOverageMinutes).toBe(90);
    expect(schedule.days.WEDNESDAY.capacityOverageMinutes).toBe(105);
  });

  it("keeps the prior-week practice-test review day ahead of a conflicting Monday practice test in a near-test week", () => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: "THURSDAY", goalTestDate: "2026-10-01" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName,
      { priorWeekPracticeTestReviewMinutes: 150 });
    expect(types(schedule.days)).toBe("review drill rest practice_test review drill drill");
    expect(schedule.days.MONDAY.activities).toHaveLength(1);
    expect(schedule.days.MONDAY.activities[0].kind).toBe("REVIEW");
  });

  it("moves a Monday-preferred near-test week's practice tests to Tuesday and Friday after a prior-week review", () => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: "MONDAY", goalTestDate: "2026-10-01" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName,
      { priorWeekPracticeTestReviewMinutes: 150 });
    expect(types(schedule.days)).toBe("review practice_test review rest practice_test review drill");
  });

  it("uses Tuesday as the practice-test cutoff when prior-week review displaces a preferred Monday practice test", () => {
    const student = { ...mockStudent, preferredPracticeTestDay: "MONDAY" as const };
    const analytics = { ...mockAnalytics, weekOf: "2026-09-21" };
    const tuesday = generateWeek(student, analytics, mockRules, mockStudentName,
      { priorWeekPracticeTestReviewMinutes: 150, createdOn: "TUESDAY" });
    const wednesday = generateWeek(student, analytics, mockRules, mockStudentName,
      { priorWeekPracticeTestReviewMinutes: 150, createdOn: "WEDNESDAY" });
    expect(tuesday.days.TUESDAY.type).toBe("practice_test");
    expect(Object.values(wednesday.days).filter((day) => day.type === "practice_test")).toHaveLength(0);
  });

  it("moves a conflicting Monday rest day to the first free day", () => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: "TUESDAY" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName,
      { priorWeekPracticeTestReviewMinutes: 150 });
    expect(schedule.days.MONDAY.type).toBe("review");
    expect(schedule.days.THURSDAY.type).toBe("rest");
  });

  it("moves a conflicting rest day to the first free day on or after creation", () => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: "TUESDAY" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName,
      { priorWeekPracticeTestReviewMinutes: 150, createdOn: "THURSDAY" });
    expect(schedule.days.THURSDAY.type).toBe("rest");
    expect(Object.values(schedule.days).filter((day) => day.type === "practice_test" || day.type === "review"))
      .toHaveLength(1);
  });

  it("moves a displaced rest day to Sunday when a Monday-preferred week with prior-week review is created on Sunday", () => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: "MONDAY" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName,
      { priorWeekPracticeTestReviewMinutes: 150, createdOn: "SUNDAY" });
    expect(types(schedule.days)).toBe("review drill drill drill drill drill rest");
  });

  it("places the second practice test only in weeks starting within the calendar month before the goal", () => {
    const student = { ...mockStudent, goalTestDate: "2026-10-01" };
    for (const [weekOf, count] of [["2026-08-31", 1], ["2026-09-07", 2], ["2026-09-28", 2], ["2026-10-05", 1]] as const) {
      const schedule = generateWeek(student, { ...mockAnalytics, weekOf }, mockRules, mockStudentName);
      expect(Object.values(schedule.days).filter((day) => day.type === "practice_test")).toHaveLength(count);
    }
  });

  it("omits both practice tests and review days when a near-test week is created after its preferred day", () => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: "MONDAY", goalTestDate: "2026-10-01" },
      { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName, { createdOn: "TUESDAY" });
    expect(types(schedule.days)).toBe("drill drill rest drill drill drill drill");
  });

  it("drops the review day of a past practice test, even when that review day is today", () => {
    const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: "SATURDAY", goalTestDate: "2026-10-01" },
      { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName, { createdOn: "THURSDAY" });
    expect(types(schedule.days)).toBe("drill rest drill drill drill practice_test review");
  });

  it.each([["TUESDAY", "rest drill drill drill drill drill drill"], ["WEDNESDAY", "drill rest drill drill drill drill drill"]] as const)(
    "keeps the computed rest day when a %s-preference week is created late", (preferred, expected) => {
      const schedule = generateWeek({ ...mockStudent, preferredPracticeTestDay: preferred },
        { ...mockAnalytics, weekOf: "2026-09-14" }, mockRules, mockStudentName, { createdOn: "THURSDAY" });
      expect(types(schedule.days)).toBe(expected);
    });
});
