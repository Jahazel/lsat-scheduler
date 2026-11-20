import type { WeekShapeOptions } from "./engine";
import { isoDateInWeek } from "./scheduleReasonText";
import type { AnalyticsSnapshot, AnalyticsTrend, PersistedWeeklySchedule, RCType, WeeklySchedule } from "./types";

const TREND_WEIGHTS = [0.6, 0.3, 0.1];
export const TREND_WINDOW = TREND_WEIGHTS.length;

export type SavedWeek = Pick<PersistedWeeklySchedule, "weekStartDate" | "schedule">;

export type NextWeekOptions = Omit<WeekShapeOptions, "createdOn"> & { priorSchedules: WeeklySchedule[] };

export function nextWeekOptions({ weekOf, saved, missedStemTypeCounts }: {
  weekOf: string;
  saved: SavedWeek[];
  missedStemTypeCounts?: WeekShapeOptions["missedStemTypeCounts"];
}): NextWeekOptions {
  const earlier = saved.filter((week) => week.weekStartDate < weekOf);
  const lastWeek = isoDateInWeek(weekOf, -7);
  const sunday = earlier.find((week) => week.weekStartDate === lastWeek)?.schedule.days.SUNDAY;
  return {
    priorWeekPracticeTestReviewMinutes: sunday?.type === "practice_test"
      ? sunday.activities.find((activity) => activity.kind === "PT")?.minutes
      : undefined,
    priorSchedules: earlier.map((week) => week.schedule),
    missedStemTypeCounts,
  };
}

function weightedAccuracy<Type extends string>(maps: (Partial<Record<Type, number>> | undefined)[]) {
  const trend: Partial<Record<Type, number>> = {};
  const types = new Set(maps.flatMap((map) => Object.keys(map ?? {}) as Type[]));
  for (const type of types) {
    let weightedSum = 0;
    let weightTotal = 0;
    maps.forEach((map, index) => {
      const accuracy = map?.[type];
      if (accuracy !== undefined) {
        weightedSum += accuracy * TREND_WEIGHTS[index];
        weightTotal += TREND_WEIGHTS[index];
      }
    });
    if (weightTotal > 0) trend[type] = weightedSum / weightTotal;
  }
  return trend;
}

export function weightedTrend(newestFirst: Omit<AnalyticsSnapshot, "weekOf">[], weekOf: string): AnalyticsTrend {
  const window = newestFirst.slice(0, TREND_WINDOW);
  const rcAccuracyByType = weightedAccuracy(window.map((snapshot) => snapshot.rcAccuracyByType));
  return {
    weekOf,
    lrAccuracyByType: weightedAccuracy(window.map((snapshot) => snapshot.lrAccuracyByType)),
    lrTopPriorityLogicTypes: window[0].lrTopPriorityLogicTypes,
    ...(Object.keys(rcAccuracyByType).length > 0 && { rcAccuracyByType }),
    rcTypesInNewestSnapshot: Object.keys(window[0].rcAccuracyByType ?? {}) as RCType[],
  };
}
