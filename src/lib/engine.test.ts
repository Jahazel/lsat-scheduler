import { describe, expect, it } from "vitest";
import { DAY_ORDER, generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { Activity, DayOfWeek, LRActivity, RCActivity, WeeklySchedule } from "./types";

const DRILL_DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "THURSDAY", "FRIDAY"];
const everyDay = (minutes: number) => Object.fromEntries(DAY_ORDER.map((day) => [day, minutes])) as Record<DayOfWeek, number>;
const isLR = (activity: Activity): activity is LRActivity => activity.kind === "LR";
const isRC = (activity: Activity): activity is RCActivity => activity.kind === "RC";
const drills = (schedule: WeeklySchedule) => DRILL_DAYS.flatMap((day) => schedule.days[day].activities);
const totals = (schedule: WeeklySchedule) => DRILL_DAYS.map((day) => schedule.days[day].totalMinutes);
const generated = (minutes: number, options: Parameters<typeof generateWeek>[4] = {}) =>
  generateWeek({ ...mockStudent, dailyCapacityMinutes: everyDay(minutes) }, mockAnalytics, mockRules, mockStudentName, options);

function minimumSubject(schedule: WeeklySchedule, day: DayOfWeek) {
  const activities = schedule.days[day].activities;
  return activities.some(isLR) ? "LR" : "RC";
}

describe("daily capacity filler", () => {
  it("gives four minimum-only days LR, RC, LR, RC and records each overage", () => {
    const schedule = generated(15);
    expect(DRILL_DAYS.map((day) => minimumSubject(schedule, day))).toEqual(["LR", "RC", "LR", "RC"]);
    expect(totals(schedule)).toEqual([30, 17.25, 30, 17.25]);
    expect(DRILL_DAYS.map((day) => schedule.days[day].capacityOverageMinutes)).toEqual([15, 2.25, 15, 2.25]);
    expect(drills(schedule).filter(isLR).map((activity) => activity.questionCount)).toEqual([5, 5, 5, 5]);
    expect(drills(schedule).some((activity) => (isLR(activity) || isRC(activity)) && activity.isFullSection)).toBe(false);
  });

  it("matches the flat 45-minute case and covers all starred types", () => {
    const schedule = generated(45);
    expect(totals(schedule)).toEqual([45, 34.5, 45, 32.25]);
    const lr = drills(schedule).filter(isLR);
    const rc = drills(schedule).filter(isRC);
    expect(lr.reduce((sum, activity) => sum + activity.questionCount, 0)).toBe(35);
    expect(rc.reduce((sum, activity) => sum + activity.passageCount, 0)).toBe(3);
    expect(mockRules.lrStarredTypes.every((type) => lr.some((activity) => activity.type === type))).toBe(true);
  });

  it("places a 60-minute full section and three 47.25-minute drilling days", () => {
    const schedule = generated(60);
    const sections = drills(schedule).filter((activity) => (isLR(activity) || isRC(activity)) && activity.isFullSection);
    expect(sections).toHaveLength(1);
    expect(sections[0].kind).toBe("LR");
    expect(schedule.days.MONDAY.totalMinutes).toBe(60);
    expect(totals(schedule).slice(1)).toEqual([47.25, 47.25, 47.25]);
  });

  it("applies accommodation time to LR questions and regular RC passages", () => {
    for (const accommodationMultiplier of [1.5, 2] as const) {
      const student = { ...mockStudent, accommodationMultiplier, dailyCapacityMinutes: everyDay(90) };
      const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
      const multiplier = mockRules.accommodationTimeMultiplier[accommodationMultiplier];
      for (const activity of drills(schedule)) {
        if (isLR(activity) && !activity.isFullSection) {
          expect(activity.drillMinutes).toBeCloseTo(activity.questionCount * 3 * multiplier, 2);
        }
        if (isRC(activity) && !activity.isFullSection) {
          expect(activity.drillMinutes).toBeCloseTo(17.25 * multiplier, 2);
        }
      }
    }
  });

  it("records a full-section overage caused by accommodation", () => {
    const student = { ...mockStudent, accommodationMultiplier: 2 as const, dailyCapacityMinutes: everyDay(60) };
    const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    expect(schedule.days.MONDAY.totalMinutes).toBe(90);
    expect(schedule.days.MONDAY.capacityOverageMinutes).toBe(30);
  });

  it("alternates full-section subject from the most recent saved schedule", () => {
    const prior = generated(60);
    const next = generated(60, { priorSchedules: [prior] });
    expect(drills(next).find((activity) => (isLR(activity) || isRC(activity)) && activity.isFullSection)?.kind).toBe("RC");
  });

  it("places the full section on the highest-capacity drilling day, tied to the earlier day", () => {
    const student = { ...mockStudent, dailyCapacityMinutes: { ...everyDay(45), TUESDAY: 90, FRIDAY: 90 } };
    const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    expect(schedule.days.TUESDAY.activities.some((activity) => (isLR(activity) || isRC(activity)) && activity.isFullSection)).toBe(true);
    expect(schedule.days.FRIDAY.activities.some((activity) => (isLR(activity) || isRC(activity)) && activity.isFullSection)).toBe(false);
  });

  it("omits the full section below score 150 or when no drilling day states 60 minutes", () => {
    const lowScore = generateWeek({ ...mockStudent, currentScore: 149 }, mockAnalytics, mockRules, mockStudentName);
    expect(drills(lowScore).some((activity) => (isLR(activity) || isRC(activity)) && activity.isFullSection)).toBe(false);
    expect(drills(generated(45)).some((activity) => (isLR(activity) || isRC(activity)) && activity.isFullSection)).toBe(false);
  });

  it("reduces each day's fill limit before adding extra work while retaining the minimum and full section", () => {
    const base = generated(90);
    const reduced = generated(90, { workloadReductionPercent: 0.25 });
    for (const day of DRILL_DAYS) {
      expect(reduced.days[day].activities.length).toBeGreaterThan(0);
      expect(reduced.days[day].totalMinutes).toBeLessThanOrEqual(base.days[day].totalMinutes);
    }
    expect(drills(reduced).filter((activity) => (isLR(activity) || isRC(activity)) && activity.isFullSection)).toHaveLength(1);
  });

  it("rotates scarce starred drills by oldest saved appearance and excludes non-starred types", () => {
    const first = generated(15);
    const second = generated(15, { priorSchedules: [first] });
    const firstTypes = new Set(drills(first).filter(isLR).map((activity) => activity.type));
    const secondTypes = new Set(drills(second).filter(isLR).map((activity) => activity.type));
    expect([...secondTypes].every((type) => mockRules.lrStarredTypes.includes(type))).toBe(true);
    expect([...secondTypes].some((type) => !firstTypes.has(type))).toBe(true);
  });

  it("uses the regular pool after starred and restricted types, and splits paired medium drills", () => {
    const schedule = generated(1200);
    const lr = drills(schedule).filter(isLR).filter((activity) => !activity.isFullSection);
    expect(lr.slice(0, mockRules.lrStarredTypes.length).map((activity) => activity.type)).toEqual(
      [...mockRules.lrStarredTypes].sort((a, b) =>
        (mockAnalytics.lrAccuracyByType[a] ?? 1) - (mockAnalytics.lrAccuracyByType[b] ?? 1)
        || [...mockRules.lrStemTypes, ...mockRules.lrLogicTypes].indexOf(a)
          - [...mockRules.lrStemTypes, ...mockRules.lrLogicTypes].indexOf(b))
    );
    expect(lr[mockRules.lrStarredTypes.length].type).toBe(mockAnalytics.lrTopPriorityLogicTypes[0]);
    expect(lr.some((activity) => activity.questionCount === 10)).toBe(true);
    const paired = new Set(mockRules.lrPairedTypes.flat());
    expect(lr.filter((activity) => paired.has(activity.type)).every((activity) => activity.questionCount === 5)).toBe(true);
  });

  it("groups subjects and alternates the leading subject across drilling days", () => {
    const schedule = generated(90);
    DRILL_DAYS.forEach((day, index) => {
      const kinds = schedule.days[day].activities.map((activity) => activity.kind);
      const firstLR = kinds.indexOf("LR");
      const firstRC = kinds.indexOf("RC");
      if (firstLR < 0 || firstRC < 0) return;
      expect(index % 2 === 1 ? firstLR < firstRC : firstRC < firstLR).toBe(true);
    });
  });
});
