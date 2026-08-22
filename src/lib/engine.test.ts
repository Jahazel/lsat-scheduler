import { describe, expect, it } from "vitest";
import { DAY_ORDER, generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent } from "./mockData";
import type { Activity, DayOfWeek, LRActivity, RCActivity } from "./types";

const DRILL_DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "THURSDAY", "FRIDAY"];

function isLR(a: Activity): a is LRActivity {
  return a.kind === "LR";
}

function isRC(a: Activity): a is RCActivity {
  return a.kind === "RC";
}

function timeCost(a: LRActivity | RCActivity): number {
  return a.drillMinutes + a.reviewMinutes;
}

describe("generateWeek", () => {
  const schedule = generateWeek(mockStudent, mockAnalytics, mockRules);
  const capacityMinutes = mockStudent.weekdayHours * 60;

  it("produces every day of the week", () => {
    for (const day of DAY_ORDER) {
      expect(schedule.days[day]).toBeDefined();
    }
  });

  it("groups LR activities before RC activities within each drill day", () => {
    for (const day of DRILL_DAYS) {
      const kinds = schedule.days[day].activities.map((a) => a.kind);
      const firstRC = kinds.indexOf("RC");
      const lastLR = kinds.lastIndexOf("LR");
      if (firstRC !== -1 && lastLR !== -1) {
        expect(lastLR).toBeLessThan(firstRC);
      }
    }
  });

  it("never schedules more than one passage per RC activity", () => {
    for (const day of DRILL_DAYS) {
      for (const activity of schedule.days[day].activities.filter(isRC)) {
        expect(activity.passageCount).toBe(1);
      }
    }
  });

  it("varies type or difficulty between back-to-back RC passages", () => {
    for (const day of DRILL_DAYS) {
      const rc = schedule.days[day].activities.filter(isRC);
      for (let i = 1; i < rc.length; i++) {
        const prev = rc[i - 1];
        const curr = rc[i];
        const identical = prev.type === curr.type && prev.difficultyLevel === curr.difficultyLevel;
        expect(identical).toBe(false);
      }
    }
  });

  it("keeps drill days roughly even in total minutes", () => {
    const minutesByDay = DRILL_DAYS.map((day) => schedule.days[day].totalMinutes);
    const spread = Math.max(...minutesByDay) - Math.min(...minutesByDay);
    expect(spread).toBeLessThanOrEqual(capacityMinutes * 0.15);
  });

  it("keeps LR and RC time roughly balanced within each drill day", () => {
    for (const day of DRILL_DAYS) {
      const activities = schedule.days[day].activities;
      const lrMinutes = activities.filter(isLR).reduce((sum, a) => sum + timeCost(a), 0);
      const rcMinutes = activities.filter(isRC).reduce((sum, a) => sum + timeCost(a), 0);
      expect(Math.abs(lrMinutes - rcMinutes)).toBeLessThanOrEqual(capacityMinutes * 0.3);
    }
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

  it("never overflows a drill day past its capacity", () => {
    for (const day of DRILL_DAYS) {
      expect(schedule.days[day].totalMinutes).toBeLessThanOrEqual(capacityMinutes + 0.01);
    }
  });

  it("doesn't crash or loop when a student has zero weekday capacity", () => {
    const zeroCapacityStudent = { ...mockStudent, weekdayHours: 0 };
    const result = generateWeek(zeroCapacityStudent, mockAnalytics, mockRules);
    for (const day of DRILL_DAYS) {
      expect(result.days[day].activities).toEqual([]);
      expect(result.days[day].totalMinutes).toBe(0);
    }
  });
});
