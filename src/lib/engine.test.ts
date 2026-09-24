import { describe, expect, it } from "vitest";
import { DAY_ORDER, generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { Activity, DayOfWeek, LRActivity, RCActivity, WeeklySchedule } from "./types";

const DRILL_DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "THURSDAY", "FRIDAY"];
const everyDay = (minutes: number) => Object.fromEntries(DAY_ORDER.map((day) => [day, minutes])) as Record<DayOfWeek, number>;
const isLR = (activity: Activity): activity is LRActivity => activity.kind === "LR";
const isRC = (activity: Activity): activity is RCActivity => activity.kind === "RC";
const drills = (schedule: WeeklySchedule) => DRILL_DAYS.flatMap((day) => schedule.days[day].activities);
const lrDrillsOn = (schedule: WeeklySchedule, day: DayOfWeek) =>
  schedule.days[day].activities.filter(isLR).filter((activity) => !activity.isFullSection);
const lrDrillsInDayOrder = (schedule: WeeklySchedule) => DAY_ORDER.flatMap((day) => lrDrillsOn(schedule, day));
const arePairedTypes = (a: string, b: string) => mockRules.lrPairedTypes.some(([first, second]) =>
  (first === a && second === b) || (first === b && second === a));
const totals = (schedule: WeeklySchedule) => DRILL_DAYS.map((day) => schedule.days[day].totalMinutes);
const generated = (minutes: number, options: Parameters<typeof generateWeek>[4] = {}) =>
  generateWeek({ ...mockStudent, dailyCapacityMinutes: everyDay(minutes) }, mockAnalytics, mockRules, mockStudentName, options);
const starredOnlyAnalytics = { ...mockAnalytics,
  lrAccuracyByType: Object.fromEntries(mockRules.lrStarredTypes.map((type) =>
    [type, mockAnalytics.lrAccuracyByType[type] ?? 0.5])),
  lrTopPriorityLogicTypes: [],
};
const regularTypes = [...mockRules.lrStemTypes, ...mockRules.lrLogicExceptions].filter((type) =>
  mockAnalytics.lrAccuracyByType[type] !== undefined);
const allTypes = new Set([...mockRules.lrStarredTypes, ...mockAnalytics.lrTopPriorityLogicTypes, ...regularTypes]);

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

  it("keeps the second-pass LR daily minimum to one complete 10-question unit", () => {
    const student = {
      ...mockStudent,
      dailyCapacityMinutes: { ...everyDay(375), FRIDAY: 30 },
    };
    const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    const fridayLR = schedule.days.FRIDAY.activities.filter(isLR);

    expect(fridayLR.reduce((total, activity) => total + activity.questionCount, 0)).toBe(10);
    expect(schedule.days.FRIDAY.capacityOverageMinutes).toBe(0);
    expect(fridayLR.map((activity) => [activity.type, activity.questionCount])).toEqual([["Diagram", 10]]);
  });

  it("uses 15 questions only when the LR daily minimum crosses the pass boundary", () => {
    const fridayQuestionCounts = new Set<number>();
    for (let earlierCapacity = 180; earlierCapacity <= 420; earlierCapacity += 5) {
      const context = `earlier capacity ${earlierCapacity}`;
      const student = { ...mockStudent,
        dailyCapacityMinutes: { ...everyDay(earlierCapacity), FRIDAY: 30 } };
      const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
      const fridayLR = schedule.days.FRIDAY.activities.filter(isLR);
      if (fridayLR.length > 0) {
        const priorTypes = new Set(DAY_ORDER.slice(0, DAY_ORDER.indexOf("FRIDAY"))
          .flatMap((day) => lrDrillsOn(schedule, day)).map((activity) => activity.type));
        const remainingFirstPass = [...allTypes].filter((type) => !priorTypes.has(type));
        const questions = fridayLR.reduce((total, activity) => total + activity.questionCount, 0);
        fridayQuestionCounts.add(questions);
        expect(questions, context).toBe(remainingFirstPass.length === 1
          ? mockRules.lrUnitSizes.small + mockRules.lrUnitSizes.medium
          : mockRules.lrUnitSizes.medium);
        if (remainingFirstPass.length === 1) {
          expect([fridayLR[0].type, fridayLR[0].questionCount], context)
            .toEqual([remainingFirstPass[0], mockRules.lrUnitSizes.small]);
          const secondPassUnit = fridayLR.slice(1);
          expect(secondPassUnit.reduce((total, activity) => total + activity.questionCount, 0),
            context).toBe(mockRules.lrUnitSizes.medium);
          expect(secondPassUnit.map((activity) => activity.questionCount), context)
            .toEqual(secondPassUnit.length === 1
              ? [mockRules.lrUnitSizes.medium]
              : [mockRules.lrUnitSizes.small, mockRules.lrUnitSizes.small]);
          if (secondPassUnit.length === 2) {
            expect(arePairedTypes(secondPassUnit[0].type, secondPassUnit[1].type), context).toBe(true);
          }
          expect(schedule.days.FRIDAY.capacityOverageMinutes, context).toBe(15);
        }
      }
    }
    expect(fridayQuestionCounts).toContain(10);
    expect(fridayQuestionCounts).toContain(15);
  });

  it("places both halves when a second-pass pair is the LR daily minimum", () => {
    const student = { ...mockStudent, dailyCapacityMinutes: { ...everyDay(395), FRIDAY: 30 } };
    const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    expect(schedule.days.FRIDAY.activities.filter(isLR).map((activity) => [activity.type, activity.questionCount]))
      .toEqual([["Parallel flawed method of reasoning", 5], ["Parallel method of reasoning", 5]]);
    expect(schedule.days.FRIDAY.capacityOverageMinutes).toBe(0);
  });

  it("takes the last first-pass drill and a whole second-pass pair as the LR daily minimum", () => {
    const student = { ...mockStudent, preferredPracticeTestDay: "SUNDAY" as const,
      dailyCapacityMinutes: { ...everyDay(240), FRIDAY: 30, SATURDAY: 120 } };
    const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    expect(schedule.days.FRIDAY.activities.filter(isLR).map((activity) => [activity.type, activity.questionCount]))
      .toEqual([["Main conclusion or main point", 5], ["Sufficient assumption", 5], ["Necessary assumption", 5]]);
    expect(schedule.days.FRIDAY.capacityOverageMinutes).toBe(15);
  });

  it("takes the last first-pass drill and a 10-question drill as the LR daily minimum", () => {
    const analytics = { ...mockAnalytics,
      lrAccuracyByType: { ...mockAnalytics.lrAccuracyByType, "Conditional reasoning": 0 } };
    const student = { ...mockStudent,
      dailyCapacityMinutes: { ...everyDay(160), TUESDAY: 405, FRIDAY: 30 } };
    const schedule = generateWeek(student, analytics, mockRules, mockStudentName);
    expect(schedule.days.FRIDAY.activities.filter(isLR).map((activity) => [activity.type, activity.questionCount]))
      .toEqual([["Main conclusion or main point", 5], ["Conditional reasoning", 10]]);
    expect(schedule.days.FRIDAY.capacityOverageMinutes).toBe(15);
  });

  it("finishes each LR first pass before the second pass and retains starred question types without rotation", () => {
    const cases = [
      { analytics: mockAnalytics, expectedTypes: allTypes, highCapacities: [150, 210, 240, 335, 420],
        lowCapacities: [15, 30, 45], scores: [mockStudent.currentScore] },
      { analytics: starredOnlyAnalytics, expectedTypes: new Set(mockRules.lrStarredTypes),
        highCapacities: [15, 45, 90, 150], lowCapacities: [15, 30, 45], scores: [140] },
    ];
    for (const { analytics, expectedTypes, highCapacities, lowCapacities, scores } of cases) {
      for (const score of scores) for (const high of highCapacities) for (const low of lowCapacities) {
        for (const reduction of [0, 0.1, 0.25]) for (const practiceTestDay of ["SATURDAY", "SUNDAY"] as const) {
          const student = { ...mockStudent, currentScore: score, preferredPracticeTestDay: practiceTestDay,
            dailyCapacityMinutes: { ...everyDay(high), THURSDAY: low, FRIDAY: low, SATURDAY: low } };
          const schedule = generateWeek(student, analytics, mockRules, mockStudentName,
            { skipReductionPercent: reduction });
          const lr = lrDrillsInDayOrder(schedule);
          const context = `${score}/${high}/${low}/${reduction}/${practiceTestDay}/${analytics === starredOnlyAnalytics ? "starred" : "full"}`;
          const seen = new Set<string>();
          const firstSecondPassIndex = lr.findIndex((activity) => {
            if (activity.questionCount === mockRules.lrUnitSizes.medium || seen.has(activity.type)) return true;
            seen.add(activity.type);
            return false;
          });
          const holdsEveryStarredType = lr.length >= mockRules.lrStarredTypes.length;
          if (firstSecondPassIndex >= 0) {
            expect(new Set(lr.slice(0, firstSecondPassIndex).map((activity) => activity.type)), context)
              .toEqual(holdsEveryStarredType ? expectedTypes : new Set(mockRules.lrStarredTypes));
          }
          for (const day of DAY_ORDER) {
            const dayLR = lrDrillsOn(schedule, day);
            for (const [index, activity] of dayLR.entries()) {
              if (firstSecondPassIndex < 0 || lr.indexOf(activity) < firstSecondPassIndex
                || activity.questionCount !== mockRules.lrUnitSizes.small) continue;
              const neighbors = [dayLR[index - 1], dayLR[index + 1]];
              expect(neighbors.some((neighbor) => neighbor
                && neighbor.questionCount === mockRules.lrUnitSizes.small
                && lr.indexOf(neighbor) >= firstSecondPassIndex
                && arePairedTypes(activity.type, neighbor.type)), context).toBe(true);
            }
          }
          if (holdsEveryStarredType) {
            const present = new Set(lr.map((activity) => activity.type));
            expect(mockRules.lrStarredTypes.filter((type) => !present.has(type)), context).toEqual([]);
          }
        }
      }
    }
  });

  it("covers all starred question types at the starred rotation boundary", () => {
    const starredBoundary = generateWeek({ ...mockStudent, currentScore: 140,
      preferredPracticeTestDay: "SUNDAY",
      dailyCapacityMinutes: { ...everyDay(15), THURSDAY: 45, FRIDAY: 45 } },
    starredOnlyAnalytics, mockRules, mockStudentName);
    const starredBoundaryTypes = new Set(lrDrillsInDayOrder(starredBoundary).map((activity) => activity.type));
    expect(starredBoundaryTypes).toEqual(new Set(mockRules.lrStarredTypes));
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
    const reduced = generated(90, { skipReductionPercent: 0.25 });
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

  it("breaks starred rotation ties by weakness and then rules-list order", () => {
    const sameAccuracy = Object.fromEntries(mockRules.lrStarredTypes.map((type) => [type, 0.8]));
    const analytics = {
      ...mockAnalytics,
      lrAccuracyByType: {
        ...mockAnalytics.lrAccuracyByType,
        ...sameAccuracy,
        Strengthen: 0.2,
        Weaken: 0.3,
      },
    };
    const schedule = generateWeek({ ...mockStudent, dailyCapacityMinutes: everyDay(15) },
      analytics, mockRules, mockStudentName);
    expect(drills(schedule).filter(isLR).map((activity) => activity.type)).toEqual([
      "Strengthen", "Weaken", "Flaw or descriptive weakening", "Necessary assumption",
    ]);
  });

  it("does not count an earlier full section as a starred rotation appearance", () => {
    const prior = generated(15);
    for (const day of DAY_ORDER) prior.days[day].activities = [];
    prior.days.MONDAY.activities = [{
      kind: "LR", type: "Sufficient assumption", questionCount: 25,
      difficultyRange: "L3-5", drillMinutes: 60, isFullSection: true,
    }];
    const next = generated(15, { priorSchedules: [prior] });
    expect(drills(next).filter(isLR)[0].type).toBe("Sufficient assumption");
  });

  it("uses reduced daily limits when deciding whether starred types rotate", () => {
    const prior = generated(15);
    for (const day of DAY_ORDER) prior.days[day].activities = [];
    prior.days.MONDAY.activities = [{
      kind: "LR", type: "Sufficient assumption", questionCount: 5,
      difficultyRange: "L2-4", drillMinutes: 15, isFullSection: false,
    }];
    const withoutReduction = generated(40, { priorSchedules: [prior] });
    const reduced = generated(40, { priorSchedules: [prior], skipReductionPercent: 0.25 });
    expect(drills(withoutReduction).filter(isLR).length).toBeGreaterThanOrEqual(mockRules.lrStarredTypes.length);
    expect(drills(reduced).filter(isLR).length).toBeLessThan(mockRules.lrStarredTypes.length);
    expect(drills(withoutReduction).filter(isLR)[0].type).toBe("Sufficient assumption");
    expect(drills(reduced).filter(isLR)[0].type).not.toBe("Sufficient assumption");
    expect(drills(reduced).filter(isLR).every((activity) => mockRules.lrStarredTypes.includes(activity.type))).toBe(true);
  });

  it("places drills only on remaining drilling days after Thursday approval", () => {
    const schedule = generated(45, { createdOn: "THURSDAY" });
    expect(["MONDAY", "TUESDAY"].every((day) => schedule.days[day as DayOfWeek].activities.length === 0)).toBe(true);
    expect(schedule.days.WEDNESDAY.type).toBe("rest");
    expect(schedule.days.THURSDAY.activities.length).toBeGreaterThan(0);
    expect(schedule.days.FRIDAY.activities.length).toBeGreaterThan(0);
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

  it("uses L2-4 for a type's first drill below the cutoff and L3-5 after that", () => {
    const schedule = generated(1200);
    const lr = drills(schedule).filter(isLR).filter((activity) => !activity.isFullSection);
    const firstType = lr[0].type;
    expect(lr.filter((activity) => activity.type === firstType).slice(0, 2).map((activity) => activity.difficultyRange))
      .toEqual(["L2-4", "L3-5"]);
  });

  it("uses L3-5 for every LR drill at the difficulty cutoff", () => {
    const schedule = generateWeek({ ...mockStudent, currentScore: mockRules.lrDifficultyCutoffScore },
      mockAnalytics, mockRules, mockStudentName);
    expect(drills(schedule).filter(isLR).filter((activity) => !activity.isFullSection)
      .every((activity) => activity.difficultyRange === "L3-5")).toBe(true);
  });

  it("keeps regular RC passages in L2-L5 and varies adjacent type or difficulty", () => {
    const schedule = generated(1200);
    const rc = drills(schedule).filter(isRC).filter((activity) => !activity.isFullSection);
    expect(rc.length).toBeGreaterThan(5);
    expect(rc.every((activity) => activity.difficultyLevel >= 2 && activity.difficultyLevel <= 5)).toBe(true);
    for (let index = 1; index < rc.length; index++) {
      expect([rc[index].type, rc[index].difficultyLevel])
        .not.toEqual([rc[index - 1].type, rc[index - 1].difficultyLevel]);
    }
  });

  it("groups subjects and alternates the leading subject across drilling days", () => {
    const schedule = generated(90);
    DRILL_DAYS.forEach((day, index) => {
      const kinds = schedule.days[day].activities.map((activity) => activity.kind);
      const firstLR = kinds.indexOf("LR");
      const firstRC = kinds.indexOf("RC");
      if (firstLR < 0 || firstRC < 0) return;
      expect(index % 2 === 1 ? firstLR < firstRC : firstRC < firstLR).toBe(true);
      expect(kinds.filter((kind, position) => position > 0 && kind !== kinds[position - 1])).toHaveLength(1);
    });
  });
});
