export type LRType =
  | "Argument Part"
  | "Evaluate"
  | "Flaw"
  | "Main Conclusion"
  | "Method of Reasoning"
  | "Most Strongly Supported"
  | "Must Be True"
  | "Must Be False"
  | "Necessary Assumption"
  | "Parallel Flawed Method of Reasoning"
  | "Parallel Method of Reasoning"
  | "Principle"
  | "Resolve Reconcile or Explain"
  | "Strengthen"
  | "Sufficient Assumption"
  | "Weaken"
  | "Diagram"
  | "Math";

export type RCType = "Art" | "Humanities" | "Science" | "Law" | "Comparative";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface Student {
  name: string;
  platform: "7Sage" | "LSAT Demon";
  weekdayHours: number;
  weekendHours: number;
  accommodationMultiplier: 1 | 1.5 | 2;
}

export interface AnalyticsSnapshot {
  weekOf: string;
  currentScore: number;
  lrAccuracyByType: Record<LRType, number>;
}

export interface RulesConfig {
  ptSourceCutoff: number;
  lrQuestionSeconds: number;
  rcPassageSeconds: number;
  ptDurationMinutes: number;
  lrStarredTypes: LRType[];
  lrAllTypes: LRType[];
  rcTypes: RCType[];
  lrUnitSizes: { small: number; medium: number; fullSection: number };
  rcUnitSizes: { small: number; medium: number; fullSection: number };
  lrDifficultyCutoffScore: number;
  reviewPercentByBand: { below160: number; mid: number; above170: number };
  restDay: DayOfWeek;
}

export interface LRActivity {
  kind: "LR";
  type: LRType;
  questionCount: number;
  difficultyRange: string;
  drillMinutes: number;
  reviewMinutes: number;
}

export interface RCActivity {
  kind: "RC";
  type: RCType;
  passageCount: number;
  difficultyLevel: number;
  drillMinutes: number;
  reviewMinutes: number;
}

export interface PTActivity {
  kind: "PT";
  label: string;
  minutes: number;
}

export interface ReviewActivity {
  kind: "REVIEW";
  label: string;
  minutes: number;
}

export type Activity = LRActivity | RCActivity | PTActivity | ReviewActivity;

export interface DayPlan {
  day: DayOfWeek;
  type: "drill" | "practice_test" | "review" | "rest";
  activities: Activity[];
  totalMinutes: number;
}

export interface WeeklySchedule {
  studentName: string;
  weekOf: string;
  days: Record<DayOfWeek, DayPlan>;
}
