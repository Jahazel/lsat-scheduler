import { summarizeAnalyticsRows } from "./analytics";
import { generateRemainingWeek, weightedTrend } from "./currentWeeklySchedule";
import { mockRules } from "./mockData";
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
  priorWeekPracticeTestReviewMinutes?: number;
  priorSchedules: WeeklySchedule[];
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
    createdOn: basis.startsOn,
    priorWeekPracticeTestReviewMinutes: basis.priorWeekPracticeTestReviewMinutes,
    priorSchedules: basis.priorSchedules,
    missedStemTypeCounts,
  });
}
