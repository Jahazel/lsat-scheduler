import { summarizeAnalyticsRows } from "./analytics";
import { generateRemainingWeek } from "./currentWeeklySchedule";
import { mockRules } from "./mockData";
import { nextWeekOptions, weightedTrend, type SavedWeek } from "./nextWeekInputs";
import type {
  AnalyticsExtractedRow, AnalyticsSnapshot, ApprovedAnalyticsSnapshot, DayOfWeek, LRStemType, Student, WeeklySchedule,
} from "./types";

export const MIN_SCORE = 120;
export const MAX_SCORE = 180;

export interface WeeklyUploadBasis {
  weekOf: string;
  plans: "this_week" | "next_week";
  startsOn: DayOfWeek;
  student: Student;
  hadPracticeTest: boolean;
  priorSnapshots: ApprovedAnalyticsSnapshot[];
  savedWeeks: SavedWeek[];
}

export function plannedWeekAnalytics(basis: WeeklyUploadBasis, rows: AnalyticsExtractedRow[]): AnalyticsSnapshot {
  const read = summarizeAnalyticsRows(rows);
  return weightedTrend([read, ...basis.priorSnapshots], basis.weekOf);
}

export function previewPlannedWeek(
  basis: WeeklyUploadBasis,
  analytics: AnalyticsSnapshot,
  currentScore: number,
  missedStemTypeCounts?: Partial<Record<LRStemType, number>>,
): WeeklySchedule {
  return generateRemainingWeek({ ...basis.student, currentScore }, analytics, mockRules, "", {
    ...nextWeekOptions({ weekOf: basis.weekOf, saved: basis.savedWeeks, missedStemTypeCounts }),
    createdOn: basis.startsOn,
  });
}
