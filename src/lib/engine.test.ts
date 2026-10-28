import { describe, expect, it } from "vitest";
import { summarizeApprovedRows } from "./analyticsSnapshots";
import { DAY_ORDER, generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { Activity, DayOfWeek, LRDrill, RCDrill, WeeklySchedule } from "./types";

const DRILL_DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "THURSDAY", "FRIDAY"];
const everyDay = (minutes: number) => Object.fromEntries(DAY_ORDER.map((day) => [day, minutes])) as Record<DayOfWeek, number>;
const isLR = (activity: Activity): activity is LRDrill => activity.kind === "LR" && !activity.isFullSection;
const isRC = (activity: Activity): activity is RCDrill => activity.kind === "RC" && !activity.isFullSection;
const isFullSection = (activity: Activity) => (activity.kind === "LR" || activity.kind === "RC") && activity.isFullSection;
const drills = (schedule: WeeklySchedule) => DRILL_DAYS.flatMap((day) => schedule.days[day].activities);
const lrDrillsOn = (schedule: WeeklySchedule, day: DayOfWeek) =>
  schedule.days[day].activities.filter(isLR);
const lrDrillsInDayOrder = (schedule: WeeklySchedule) => DAY_ORDER.flatMap((day) => lrDrillsOn(schedule, day));
const arePairedTypes = (a: string, b: string) => mockRules.lrPairedTypes.some(([first, second]) =>
  (first === a && second === b) || (first === b && second === a));
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

describe("daily capacity filler", () => {
  it("finishes each LR first pass before the second pass and retains starred question types without rotation", () => {
    const cases = [
      { analytics: mockAnalytics, expectedTypes: allTypes, highCapacities: [150, 210, 240, 335, 420],
        lowCapacities: [30, 45], scores: [mockStudent.currentScore] },
      { analytics: starredOnlyAnalytics, expectedTypes: new Set(mockRules.lrStarredTypes),
        highCapacities: [30, 45, 90, 150], lowCapacities: [30, 45], scores: [140] },
    ];
    for (const { analytics, expectedTypes, highCapacities, lowCapacities, scores } of cases) {
      for (const score of scores) for (const high of highCapacities) for (const low of lowCapacities) {
        for (const practiceTestDay of ["SATURDAY", "SUNDAY"] as const) {
          const student = { ...mockStudent, currentScore: score, preferredPracticeTestDay: practiceTestDay,
            dailyCapacityMinutes: { ...everyDay(high), THURSDAY: low, FRIDAY: low, SATURDAY: low } };
          const schedule = generateWeek(student, analytics, mockRules, mockStudentName);
          const singles = lrDrillsInDayOrder(schedule).filter((activity) => activity.types.length === 1);
          const context = `${score}/${high}/${low}/${practiceTestDay}/${analytics === starredOnlyAnalytics ? "starred" : "full"}`;
          const firstSecondPassIndex = singles.findIndex((activity) => activity.questionCount === mockRules.lrUnitSizes.medium);
          if (firstSecondPassIndex >= 0) {
            expect(new Set(singles.slice(0, firstSecondPassIndex).map((activity) => activity.types[0])), context)
              .toEqual(expectedTypes);
          }
          if (singles.length >= mockRules.lrStarredTypes.length) {
            const present = new Set(singles.map((activity) => activity.types[0]));
            expect(mockRules.lrStarredTypes.filter((type) => !present.has(type)), context).toEqual([]);
          }
        }
      }
    }
  });

  it("names every starred type a week leaves out in the starred rotation reason", () => {
    for (let capacity = 30; capacity <= 120; capacity += 15) {
      const schedule = generated(capacity);
      const drilled = new Set(drills(schedule).filter(isLR).flatMap((activity) => activity.types));
      const sittingOut = mockRules.lrStarredTypes.filter((type) => !drilled.has(type));
      const sentence = schedule.reasons?.find((reason) => reason.code === "starred_rotation")?.sentence;
      if (sittingOut.length === 0) expect(sentence, `${capacity}`).toBeUndefined();
      else sittingOut.forEach((type) => expect(sentence, `${capacity}`).toContain(type));
    }
  });

  it("places one 60-minute full section on the first highest-capacity drilling day", () => {
    const sections = drills(generated(60)).filter((activity) => isFullSection(activity));
    expect(sections).toEqual([{ kind: "LR", drillMinutes: 60, isFullSection: true }]);
    expect(generated(60).days.MONDAY.activities).toContainEqual(sections[0]);
  });

  it("applies accommodation time to LR questions and regular RC passages", () => {
    for (const accommodationMultiplier of [1.5, 2] as const) {
      const student = { ...mockStudent, accommodationMultiplier, dailyCapacityMinutes: everyDay(90) };
      const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
      const multiplier = mockRules.accommodationTimeMultiplier[accommodationMultiplier];
      for (const activity of drills(schedule)) {
        if (isLR(activity)) {
          expect(activity.drillMinutes).toBeCloseTo(activity.questionCount * 3 * multiplier, 2);
        }
        if (isRC(activity)) {
          expect(activity.drillMinutes).toBeCloseTo(activity.passages.length * 17.25 * multiplier, 1);
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
    expect(drills(next).find((activity) => isFullSection(activity))?.kind).toBe("RC");
  });

  it("places the full section on the highest-capacity drilling day, tied to the earlier day", () => {
    const student = { ...mockStudent, dailyCapacityMinutes: { ...everyDay(45), TUESDAY: 90, FRIDAY: 90 } };
    const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    expect(schedule.days.TUESDAY.activities.some((activity) => isFullSection(activity))).toBe(true);
    expect(schedule.days.FRIDAY.activities.some((activity) => isFullSection(activity))).toBe(false);
  });

  it("omits the full section below score 150 or when no drilling day states 60 minutes", () => {
    const lowScore = generateWeek({ ...mockStudent, currentScore: 149 }, mockAnalytics, mockRules, mockStudentName);
    expect(drills(lowScore).some((activity) => isFullSection(activity))).toBe(false);
    expect(drills(generated(45)).some((activity) => isFullSection(activity))).toBe(false);
  });

  it("rotates scarce starred drills by oldest saved appearance and excludes non-starred types", () => {
    const first = generated(30, { createdOn: "FRIDAY" });
    const second = generated(30, { createdOn: "FRIDAY", priorSchedules: [first] });
    const firstTypes = new Set(drills(first).filter(isLR).map((activity) => activity.types[0]));
    const secondTypes = new Set(drills(second).filter(isLR).map((activity) => activity.types[0]));
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
    const schedule = generateWeek({ ...mockStudent, dailyCapacityMinutes: everyDay(30) },
      analytics, mockRules, mockStudentName, { createdOn: "FRIDAY" });
    expect(lrDrillsOn(schedule, "FRIDAY").map((activity) => activity.types)).toEqual([
      ["Strengthen"], ["Strengthen", "Weaken"],
    ]);
    expect(schedule.reasons?.find((reason) => reason.code === "starred_rotation")?.sentence)
      .toBe("Conditional reasoning, Flaw or descriptive weakening, Necessary assumption, and Sufficient assumption sit out this week in the starred rotation.");
  });

  it("places drills only on remaining drilling days after Thursday approval", () => {
    const schedule = generated(45, { createdOn: "THURSDAY" });
    expect(["MONDAY", "TUESDAY"].every((day) => schedule.days[day as DayOfWeek].activities.length === 0)).toBe(true);
    expect(schedule.days.WEDNESDAY.type).toBe("rest");
    expect(schedule.days.THURSDAY.activities.length).toBeGreaterThan(0);
    expect(schedule.days.FRIDAY.activities.length).toBeGreaterThan(0);
  });

  it("uses the regular pool after starred and restricted types, and keeps each paired line to 10 questions", () => {
    const lr = drills(generated(1200)).filter(isLR);
    const singles = lr.filter((activity) => activity.types.length === 1);
    expect(singles.slice(0, mockRules.lrStarredTypes.length).map((activity) => activity.types[0])).toEqual(
      [...mockRules.lrStarredTypes].sort((a, b) =>
        (mockAnalytics.lrAccuracyByType[a] ?? 1) - (mockAnalytics.lrAccuracyByType[b] ?? 1)
        || [...mockRules.lrStemTypes, ...mockRules.lrLogicTypes].indexOf(a)
          - [...mockRules.lrStemTypes, ...mockRules.lrLogicTypes].indexOf(b))
    );
    expect(singles[mockRules.lrStarredTypes.length].types[0]).toBe(mockAnalytics.lrTopPriorityLogicTypes[0]);
    const paired = lr.filter((activity) => activity.types.length === 2);
    expect(paired.length).toBeGreaterThan(0);
    for (const activity of paired) {
      expect(activity.questionCount).toBe(10);
      expect(arePairedTypes(activity.types[0], activity.types[1] ?? "")).toBe(true);
    }
  });

  it("drills a type 7Sage marks High as top priority, like Highest", () => {
    const { lrTopPriorityLogicTypes } = summarizeApprovedRows([
      { type: "Sampling", category: "restricted", priorityTier: "high", isTopPriority: true },
      { type: "Causal reasoning", category: "restricted", priorityTier: "medium", isTopPriority: false },
    ]);
    const schedule = generateWeek({ ...mockStudent, dailyCapacityMinutes: everyDay(1200) },
      { ...mockAnalytics, lrTopPriorityLogicTypes }, mockRules, mockStudentName);
    const drilled = drills(schedule).filter(isLR).flatMap((activity) => activity.types);

    expect(drilled).toContain("Sampling");
    expect(drilled).not.toContain("Causal reasoning");
  });

  it("uses L2-4 for a type's first drill below the cutoff and L3-5 after that", () => {
    const schedule = generated(1200);
    const lr = drills(schedule).filter(isLR).filter((activity) => activity.types.length === 1);
    const firstType = lr[0].types[0];
    expect(lr.filter((activity) => activity.types[0] === firstType).slice(0, 2).map((activity) => activity.difficultyRange))
      .toEqual(["L2-4", "L3-5"]);
  });

  it("uses L3-5 for every LR drill at the difficulty cutoff", () => {
    const schedule = generateWeek({ ...mockStudent, currentScore: mockRules.lrDifficultyCutoffScore },
      mockAnalytics, mockRules, mockStudentName);
    expect(drills(schedule).filter(isLR)
      .every((activity) => activity.difficultyRange === "L3-5")).toBe(true);
  });

  it("keeps regular RC passages in L2-L5 and varies adjacent type or difficulty", () => {
    const schedule = generated(1200);
    const rc = drills(schedule).filter(isRC).flatMap((activity) => activity.passages);
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

const isPaired = (activity: LRDrill) => activity.types.length === 2;
const firstSingleType = (schedule: WeeklySchedule) =>
  lrDrillsInDayOrder(schedule).find((activity) => !isPaired(activity))?.types;
const reasonCodes = (schedule: WeeklySchedule) => (schedule.reasons ?? []).map((reason) => reason.code);
const activeDrillDays = (schedule: WeeklySchedule) => DAY_ORDER.filter((day) =>
  schedule.days[day].type === "drill" && schedule.days[day].activities.length > 0);
const rcAccuracy = { Law: 0.4, Science: 0.5, Art: 0.6, Humanities: 0.7, Comparative: 0.8 };

describe("adaptive weekly schedule v3", () => {
  it("lands every drilling day in its fill window for every capacity and accommodation", () => {
    for (const accommodationMultiplier of [1, 1.5, 2] as const) {
      for (const currentScore of [149, 160]) {
        for (let capacity = 30; capacity <= 480; capacity += 15) {
          const uneven = everyDay(0);
          DAY_ORDER.forEach((day, index) => { uneven[day] = 30 + ((capacity - 30 + index * 45) % 465); });
          for (const dailyCapacityMinutes of [everyDay(capacity), uneven]) {
            const schedule = generateWeek({ ...mockStudent, accommodationMultiplier, currentScore, dailyCapacityMinutes },
              mockAnalytics, mockRules, mockStudentName);
            for (const day of activeDrillDays(schedule)) {
              const context = `${accommodationMultiplier}/${currentScore}/${capacity}/${day}`;
              const total = schedule.days[day].totalMinutes;
              expect(total, context).toBeGreaterThanOrEqual(dailyCapacityMinutes[day] - 10);
              expect(total, context).toBeLessThanOrEqual(dailyCapacityMinutes[day] + 30);
              expect(lrDrillsOn(schedule, day).filter(isPaired).length, context).toBeLessThanOrEqual(1);
            }
          }
        }
      }
    }
  });

  it("does not cap practice-test or review days and writes no overage or skip reason", () => {
    const schedule = generated(30);
    expect(schedule.days.SATURDAY.totalMinutes).toBe(150);
    expect(schedule.days.SUNDAY.totalMinutes).toBe(150);
    expect(reasonCodes(schedule)).not.toContain("capacity_overage");
    expect(reasonCodes(schedule)).not.toContain("skip_reduction");
  });

  it("uses 5-question LR lines on the first pass and 10 questions of one type after", () => {
    const lr = lrDrillsInDayOrder(generated(480)).filter((activity) => !isPaired(activity));
    const seen = new Set<string>();
    for (const activity of lr) {
      expect([5, 10]).toContain(activity.questionCount);
      if (activity.questionCount === 10) expect(seen.has(activity.types[0]), activity.types[0]).toBe(true);
      seen.add(activity.types[0]);
    }
    expect(lr.slice(0, allTypes.size).every((activity) => activity.questionCount === 5)).toBe(true);
    expect(lr.slice(allTypes.size).filter((activity) => activity.questionCount === 10).length).toBeGreaterThan(5);
  });

  it("places 2 paired lines on separate days at 160 and exactly 1 at 159", () => {
    const at160 = lrDrillsInDayOrder(generated(90)).filter(isPaired);
    expect(at160.map((activity) => [activity.types, activity.questionCount])).toEqual([
      [["Sufficient assumption", "Necessary assumption"], 10],
      [["Sufficient assumption", "Necessary assumption"], 10],
    ]);
    const schedule160 = generated(90);
    expect(DAY_ORDER.filter((day) => lrDrillsOn(schedule160, day).some(isPaired))).toEqual(["MONDAY", "TUESDAY"]);
    const at159 = generateWeek({ ...mockStudent, currentScore: 159, dailyCapacityMinutes: everyDay(90) },
      mockAnalytics, mockRules, mockStudentName);
    expect(DAY_ORDER.filter((day) => lrDrillsOn(at159, day).some(isPaired))).toEqual(["MONDAY"]);
  });

  it("places 1 paired line at 160 when only one drilling day remains", () => {
    const schedule = generated(90, { createdOn: "FRIDAY" });
    expect(lrDrillsInDayOrder(schedule).filter(isPaired)).toHaveLength(1);
    expect(lrDrillsOn(schedule, "FRIDAY").filter(isPaired)).toHaveLength(1);
  });

  it("keeps the paired line on a one-day week with little room by making it the daily minimum", () => {
    for (const currentScore of [159, 160]) {
      const schedule = generateWeek({ ...mockStudent, currentScore, accommodationMultiplier: 2, dailyCapacityMinutes: everyDay(30) },
        mockAnalytics, mockRules, mockStudentName, { createdOn: "FRIDAY" });
      expect(lrDrillsOn(schedule, "FRIDAY").filter(isPaired), `${currentScore}`).toHaveLength(1);
    }
  });

  it("places the paired line after an unpaired missed type that reaches capacity", () => {
    const schedule = generateWeek({ ...mockStudent, dailyCapacityMinutes: everyDay(75) }, mockAnalytics, mockRules,
      mockStudentName, { createdOn: "FRIDAY", missedStemTypeCounts: { Evaluate: 4 } });
    expect(lrDrillsOn(schedule, "FRIDAY").map((activity) => activity.types)).toEqual([
      ["Evaluate"], ["Sufficient assumption", "Necessary assumption"],
    ]);
    expect(schedule.days.FRIDAY.totalMinutes).toBe(105);
  });

  it("gives each RC type one passage, lowest accuracy first, then repeats only types with an accuracy", () => {
    for (const [analytics, firstPass, repeats] of [
      [{ ...mockAnalytics, rcAccuracyByType: rcAccuracy }, ["Law", "Science", "Art", "Humanities", "Comparative"],
        ["Law", "Science", "Art", "Humanities", "Comparative"]],
      [mockAnalytics, mockRules.rcTypes, mockRules.rcTypes],
      [{ ...mockAnalytics, rcAccuracyByType: { Art: 0.7, Science: 0.5, Comparative: 0.6 } },
        ["Science", "Comparative", "Art", "Humanities", "Law"], ["Science", "Comparative", "Art"]],
      [{ ...mockAnalytics, rcAccuracyByType: { Comparative: 1, Law: 0.5 } }, ["Law", "Comparative", "Art", "Humanities", "Science"],
        ["Law", "Comparative"]],
    ] as const) {
      const schedule = generateWeek({ ...mockStudent, dailyCapacityMinutes: everyDay(90) }, analytics, mockRules, mockStudentName);
      const rcByDay = DAY_ORDER.map((day) => schedule.days[day].activities.filter(isRC));
      const singles = rcByDay.flat().filter((activity) => activity.passages.length === 1);
      expect(singles.length).toBeGreaterThan(0);
      rcByDay.forEach((day) => day.slice(1).forEach((activity) => expect(activity.passages).toHaveLength(2)));
      for (const activity of rcByDay.flat()) {
        if (activity.passages.length === 2) expect(activity.passages[0].type).not.toBe(activity.passages[1].type);
      }
      const types = rcByDay.flat().flatMap((activity) => activity.passages.map((passage) => passage.type));
      expect(types.length).toBeGreaterThan(firstPass.length + 1);
      expect(types.slice(0, firstPass.length)).toEqual(firstPass);
      types.slice(firstPass.length).forEach((type, index) => expect(type).toBe(repeats[index % repeats.length]));
    }
  });

  it("gives RC passages after the first 5 only to types with an accuracy, in 1- and 2-passage drills", () => {
    const analytics = { ...mockAnalytics, rcAccuracyByType: { Art: 0.7, Science: 0.5, Comparative: 0.6 } };
    const schedule = generateWeek({ ...mockStudent, dailyCapacityMinutes: everyDay(210) }, analytics, mockRules,
      mockStudentName);
    const rc = DAY_ORDER.flatMap((day) => schedule.days[day].activities.filter(isRC));
    const types = rc.flatMap((activity) => activity.passages.map((passage) => passage.type));
    expect(types.length).toBeGreaterThan(10);
    expect(new Set(types.slice(0, 5))).toEqual(new Set(mockRules.rcTypes));
    expect(new Set(types.slice(5))).toEqual(new Set(["Science", "Comparative", "Art"]));
    expect(rc.some((activity) => activity.passages.length === 2)).toBe(true);
  });

  it("puts the most-missed stem type first for one week with a week note", () => {
    const missed = generated(90, { missedStemTypeCounts: { Weaken: 3, "Flaw or descriptive weakening": 1 } });
    expect(firstSingleType(missed)).toEqual(["Weaken"]);
    expect(lrDrillsInDayOrder(missed).filter(isPaired)[0].types).toEqual(["Weaken", "Strengthen"]);
    expect(missed.reasons).toContainEqual({ code: "missed_type_priority", placement: { scope: "week" },
      sentence: "Weaken comes first this week. You missed it most on your last practice test." });

    const unpaired = generated(90, { missedStemTypeCounts: { Evaluate: 4 } });
    expect(lrDrillsInDayOrder(unpaired)[0].types).toEqual(["Evaluate"]);

    const tie = generated(90, { missedStemTypeCounts: { Inference: 2, Evaluate: 2 } });
    expect(firstSingleType(tie)).toEqual(["Evaluate"]);

    const plain = generated(90);
    expect(firstSingleType(plain)).toEqual(["Sufficient assumption"]);
    expect(generated(90, { missedStemTypeCounts: {} })).toEqual(plain);
    expect(reasonCodes(plain)).not.toContain("missed_type_priority");

    const nextWeek = generateWeek({ ...mockStudent, dailyCapacityMinutes: everyDay(90) },
      { ...mockAnalytics, weekOf: "2026-08-31" }, mockRules, mockStudentName, { priorSchedules: [missed] });
    expect(firstSingleType(nextWeek)).not.toEqual(["Weaken"]);
    expect(reasonCodes(nextWeek)).not.toContain("missed_type_priority");
  });
});
