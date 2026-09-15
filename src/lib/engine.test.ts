import { describe, expect, it } from "vitest";
import { DAY_ORDER, generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { Activity, DayOfWeek, LRActivity, RCActivity } from "./types";

const DRILL_DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "THURSDAY", "FRIDAY"];

function isLR(a: Activity): a is LRActivity {
  return a.kind === "LR";
}

function isRC(a: Activity): a is RCActivity {
  return a.kind === "RC";
}

// Mirrors engine.ts's own rounding, so expected values account for the same
// 0.1-minute rounding the engine applies before comparing.
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function plannedMinutes(activities: Activity[]): number {
  return activities.reduce(
    (sum, a) => (isLR(a) || isRC(a) ? sum + a.drillMinutes + a.reviewMinutes : sum),
    0
  );
}

describe("generateWeek", () => {
  const schedule = generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);
  const capacityMinutes = mockStudent.weekdayHours * 60;

  // The day carrying the week's one full section is the one exception to
  // "LR generally leads": a real section is a single sitting expected to
  // dominate whichever day it lands on — completely, if it's RC's turn to
  // get it that week — so it's excluded from the per-day pace assertions
  // below.
  const fullSectionDayIndex = DRILL_DAYS.findIndex((day) =>
    schedule.days[day].activities.some((a) => (isLR(a) || isRC(a)) && a.isFullSection)
  );
  const affectedByFullSection = (i: number) => i === fullSectionDayIndex;

  // The day right before the full section carries a second, separate
  // exception: LR's mandatory floor (7 items) alone usually spans more than
  // one day's capacity, so the day that finally reaches the full-section
  // candidate in the list often can't fit it — and, since the pace-based
  // fill stops that day's fill outright rather than letting RC take over
  // (see fillDrillDay), that day legitimately lands under capacity.
  // Total-minutes and capacity-tolerance assertions need this wider
  // exemption.
  const nearFullSection = (i: number) => i === fullSectionDayIndex || i === fullSectionDayIndex - 1;

  it("produces every day of the week", () => {
    for (const day of DAY_ORDER) {
      expect(schedule.days[day]).toBeDefined();
    }
  });

  it("groups LR and RC into blocks (never interleaved), alternating which leads day to day", () => {
    // Monday (index 0) leads with RC, Tuesday (index 1) leads with LR, and
    // so on down DRILL_DAYS — but within a day, LR and RC never interleave.
    DRILL_DAYS.forEach((day, i) => {
      const kinds = schedule.days[day].activities.map((a) => a.kind);
      const firstRC = kinds.indexOf("RC");
      const lastLR = kinds.lastIndexOf("LR");
      const lrFirst = i % 2 === 1;
      if (firstRC !== -1 && lastLR !== -1) {
        if (lrFirst) {
          expect(lastLR).toBeLessThan(firstRC);
        } else {
          expect(kinds.lastIndexOf("RC")).toBeLessThan(kinds.indexOf("LR"));
        }
      }
    });
  });

  it("never schedules more than one passage per non-full-section RC activity", () => {
    for (const day of DRILL_DAYS) {
      for (const activity of schedule.days[day].activities.filter(isRC)) {
        if (activity.isFullSection) continue; // one section, all its passages, in one sitting
        expect(activity.passageCount).toBe(1);
      }
    }
  });

  it("varies type or difficulty between back-to-back RC passages", () => {
    for (const day of DRILL_DAYS) {
      const rc = schedule.days[day].activities.filter(isRC).filter((a) => !a.isFullSection);
      for (let i = 1; i < rc.length; i++) {
        const prev = rc[i - 1];
        const curr = rc[i];
        const identical = prev.type === curr.type && prev.difficultyLevel === curr.difficultyLevel;
        expect(identical).toBe(false);
      }
    }
  });

  it("keeps drill days reasonably even within indivisible hard-cap work", () => {
    const minutesByDay = DRILL_DAYS.filter((_, i) => !nearFullSection(i)).map(
      (day) => schedule.days[day].totalMinutes
    );
    const spread = Math.max(...minutesByDay) - Math.min(...minutesByDay);
    expect(spread).toBeLessThanOrEqual(capacityMinutes * 0.3);
  });

  it("keeps the week's overall LR-question-to-RC-passage pace close to the stated 20-to-2 rule of thumb", () => {
    const allActivities = DRILL_DAYS.flatMap((day) => schedule.days[day].activities);
    const lrQuestions = allActivities
      .filter(isLR)
      .filter((a) => !a.isFullSection)
      .reduce((sum, a) => sum + a.questionCount, 0);
    const rcPassages = allActivities
      .filter(isRC)
      .filter((a) => !a.isFullSection)
      .reduce((sum, a) => sum + a.passageCount, 0);

    expect(rcPassages).toBeGreaterThan(0);
    // Stated rule of thumb is 20:2 (10:1) — a single 4-drill-day week is too
    // short a horizon for the pace-catch-up loop to land on that exactly,
    // so this checks it's in the right neighborhood, not pinned to 10.
    expect(lrQuestions / rcPassages).toBeGreaterThanOrEqual(6);
    expect(lrQuestions / rcPassages).toBeLessThanOrEqual(16);
  });

  it("prefers offering more LR than RC time on any given non-full-section day", () => {
    DRILL_DAYS.forEach((day, i) => {
      if (affectedByFullSection(i)) return;
      const activities = schedule.days[day].activities;
      const lrMinutes = activities.filter(isLR).reduce((sum, a) => sum + a.drillMinutes, 0);
      const rcMinutes = activities.filter(isRC).reduce((sum, a) => sum + a.drillMinutes, 0);
      // "Prefer" isn't absolute — RC's larger per-passage time cost can
      // occasionally edge out a couple of LR's smaller per-question units
      // on a given day even while LR leads on pace (an "obvious exception,"
      // per spec) — but RC shouldn't meaningfully dominate the day the way
      // the pre-pace-tracking bug let it.
      expect(rcMinutes).toBeLessThanOrEqual(lrMinutes + capacityMinutes * 0.15);
    });
  });

  it("still front-loads starred and top-priority LR types first, in order", () => {
    // However many LR items fit into Monday's half-day budget, they should
    // be an exact prefix of the starred + top-priority order — not
    // necessarily all of it, since a small daily capacity can defer the
    // rest to Tuesday via the existing cross-day index.
    const monday = schedule.days.MONDAY.activities.filter((a) => a.kind === "LR");
    const expectedFirst = [...mockRules.lrStarredTypes, ...mockAnalytics.lrTopPriorityLogicTypes];
    const actualFirst = monday.map((a) => a.type);
    expect(actualFirst).toEqual(expectedFirst.slice(0, actualFirst.length));
  });

  it("keeps the rest day empty and untouched", () => {
    const restDay = schedule.days[mockRules.restDay];
    expect(restDay.type).toBe("rest");
    expect(restDay.activities).toEqual([]);
    expect(restDay.totalMinutes).toBe(0);
  });

  it("keeps the practice test and review days unchanged", () => {
    expect(schedule.days.SATURDAY.type).toBe("practice_test");
    expect(schedule.days.SATURDAY.totalMinutes).toBe(
      mockRules.ptDurationMinutes * mockStudent.accommodationMultiplier
    );
    expect(schedule.days.SUNDAY.type).toBe("review");
    expect(schedule.days.SUNDAY.totalMinutes).toBe(mockStudent.weekendHours * 60);
  });

  it("keeps a drill day's total planned time within its capacity", () => {
    DRILL_DAYS.forEach((day, i) => {
      if (nearFullSection(i)) return;
      expect(
        schedule.days[day].totalMinutes
      ).toBeLessThanOrEqual(capacityMinutes);
    });
  });

  it("keeps an uneven two-hour drill day within the hard capacity cap", () => {
    const student = { ...mockStudent, weekdayHours: 2 };
    const result = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    const fullSectionDayIndex = DRILL_DAYS.findIndex((day) =>
      result.days[day].activities.some((a) => (isLR(a) || isRC(a)) && a.isFullSection)
    );
    DRILL_DAYS.forEach((day, i) => {
      if (i === fullSectionDayIndex || i === fullSectionDayIndex - 1) return;
      expect(
        result.days[day].totalMinutes
      ).toBeLessThanOrEqual(120);
    });
  });

  it("never exceeds a drilling day's stated capacity", () => {
    const student = { ...mockStudent, weekdayHours: 2 };
    const result = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    for (const day of DRILL_DAYS) {
      expect(plannedMinutes(result.days[day].activities)).toBeLessThanOrEqual(student.weekdayHours * 60);
    }
  });

  it("doesn't crash or loop when a student has zero weekday capacity", () => {
    const zeroCapacityStudent = { ...mockStudent, weekdayHours: 0 };
    const result = generateWeek(zeroCapacityStudent, mockAnalytics, mockRules, mockStudentName);
    for (const day of DRILL_DAYS) {
      expect(result.days[day].activities).toEqual([]);
      expect(result.days[day].totalMinutes).toBe(0);
    }
  });

  it("scales practice test time by the mapped accommodation multiplier, not the raw one", () => {
    const extraTimeStudent = { ...mockStudent, accommodationMultiplier: 1.5 as const };
    const result = generateWeek(extraTimeStudent, mockAnalytics, mockRules, mockStudentName);
    const expected = mockRules.ptDurationMinutes * mockRules.accommodationTimeMultiplier[1.5];
    expect(result.days.SATURDAY.totalMinutes).toBeCloseTo(expected, 5);
    expect(result.days.SATURDAY.totalMinutes).not.toBeCloseTo(mockRules.ptDurationMinutes * 1.5, 5);
  });

  it("never schedules an RC passage at L1", () => {
    const bigStudent = { ...mockStudent, weekdayHours: 20 };
    const schedule = generateWeek(bigStudent, mockAnalytics, mockRules, mockStudentName);
    for (const day of DRILL_DAYS) {
      for (const activity of schedule.days[day].activities.filter(isRC)) {
        expect(activity.difficultyLevel).toBeGreaterThanOrEqual(2);
        expect(activity.difficultyLevel).toBeLessThanOrEqual(5);
      }
    }
  });

  it("splits 10-question LR drills into 5+5 for paired types", () => {
    const bigStudent = { ...mockStudent, weekdayHours: 20 };
    const schedule = generateWeek(bigStudent, mockAnalytics, mockRules, mockStudentName);
    const pairedTypes = new Set(mockRules.lrPairedTypes.flat());
    for (const day of DRILL_DAYS) {
      for (const activity of schedule.days[day].activities.filter(isLR)) {
        if (pairedTypes.has(activity.type)) {
          expect(activity.questionCount).not.toBe(mockRules.lrUnitSizes.medium);
        }
      }
    }
  });

  it("integrates exactly one full section a week, LR or RC, at a flat accommodation-scaled time", () => {
    const bigStudent = { ...mockStudent, weekdayHours: 20 };
    const schedule = generateWeek(bigStudent, mockAnalytics, mockRules, mockStudentName);

    const fullSectionLR = DRILL_DAYS.flatMap((day) =>
      schedule.days[day].activities.filter(isLR).filter((a) => a.isFullSection)
    );
    const fullSectionRC = DRILL_DAYS.flatMap((day) =>
      schedule.days[day].activities.filter(isRC).filter((a) => a.isFullSection)
    );

    // Exactly one subject gets the week's one full section — never both,
    // never neither — and it's a single sitting, not split across days.
    const lrHasIt = fullSectionLR.length > 0;
    const rcHasIt = fullSectionRC.length > 0;
    expect(lrHasIt !== rcHasIt).toBe(true);
    expect(fullSectionLR.length + fullSectionRC.length).toBe(1);

    if (lrHasIt) {
      expect(fullSectionLR[0].drillMinutes).toBeCloseTo(mockRules.fullSectionMinutes, 5);
    } else {
      expect(fullSectionRC[0].passageCount).toBe(mockRules.rcUnitSizes.fullSection);
      expect(fullSectionRC[0].drillMinutes).toBeCloseTo(mockRules.fullSectionMinutes, 5);
    }
  });

  it("accommodation-scales LR question time but not regular RC passage time", () => {
    // Regression case: 15 LR questions + 2 RC passages at 200% extra time
    // (mapped multiplier 1.5) should be 15×3×1.5 + 2×17.25 = 102 minutes —
    // RC passages don't pick up the multiplier the way LR questions do.
    const extraTimeStudent = { ...mockStudent, accommodationMultiplier: 2 as const, weekdayHours: 20 };
    const schedule = generateWeek(extraTimeStudent, mockAnalytics, mockRules, mockStudentName);
    const mult = mockRules.accommodationTimeMultiplier[2];

    for (const day of DRILL_DAYS) {
      for (const a of schedule.days[day].activities.filter(isLR)) {
        if (a.isFullSection) continue;
        const expected = round1((a.questionCount * mockRules.lrQuestionSeconds * mult) / 60);
        expect(a.drillMinutes).toBeCloseTo(expected, 1);
      }
      for (const a of schedule.days[day].activities.filter(isRC)) {
        if (a.isFullSection) continue;
        const expected = round1((a.passageCount * mockRules.rcPassageSeconds) / 60);
        expect(a.drillMinutes).toBeCloseTo(expected, 1);
      }
    }
  });

  it("keeps the displayed total aligned with planned drill and review time", () => {
    for (const day of DRILL_DAYS) {
      const activities = schedule.days[day].activities;
      expect(Math.abs(schedule.days[day].totalMinutes - plannedMinutes(activities))).toBeLessThan(1);
    }
  });

  it("keeps RC from dominating the day right before the week's full section", () => {
    // Regression case: this is the exact student/capacity combination that
    // originally produced a Thursday with 1 LR item vs 5 RC passages
    // (~90/10 split) — LR's next queued item was the week's full section,
    // too big to fit, so RC used to fill the rest of the day alone.
    // Stopping the day's fill the moment the pace-favored side gets stuck
    // (rather than letting the other side take over) keeps RC from running
    // away with the day — landing under capacity that day is the accepted
    // trade, per spec.
    const student = { ...mockStudent, currentScore: 164, accommodationMultiplier: 2 as const, weekdayHours: 2 };
    const result = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    const capacity = student.weekdayHours * 60;

    const fullSectionDayIndex = DRILL_DAYS.findIndex((day) =>
      result.days[day].activities.some((a) => (isLR(a) || isRC(a)) && a.isFullSection)
    );

    DRILL_DAYS.forEach((day, i) => {
      if (i === fullSectionDayIndex) return;
      const activities = result.days[day].activities;
      const lrMinutes = activities.filter(isLR).reduce((sum, a) => sum + a.drillMinutes, 0);
      const rcMinutes = activities.filter(isRC).reduce((sum, a) => sum + a.drillMinutes, 0);

      expect(rcMinutes).toBeLessThanOrEqual(lrMinutes + capacity * 0.15);
    });
  });
});
