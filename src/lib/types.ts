// Question Stem — what the question asks you to do. Drilled normally.
export type LRStemType =
  | "Argument part"
  | "Evaluate"
  | "Except (LR)"
  | "Fill in the blank"
  | "Flaw or descriptive weakening"
  | "Inference"
  | "Main conclusion or main point"
  | "Method of reasoning or descriptive"
  | "Miscellaneous (LR)"
  | "Most strongly supported"
  | "Must be false"
  | "Must be true"
  | "Necessary assumption"
  | "PSA - find or complete the application"
  | "PSA - find the rule"
  | "Parallel flawed method of reasoning"
  | "Parallel method of reasoning"
  | "Point at issue: agree"
  | "Point at issue: disagree"
  | "Principle"
  | "Resolve reconcile or explain"
  | "Strengthen"
  | "Sufficient assumption"
  | "Weaken";

// Stimulus Logic — what kind of reasoning trick the argument uses. Rare by
// default; only Diagram/Math/Conditional reasoning are drilled normally
// (see RulesConfig.lrLogicExceptions). The rest only appear when flagged
// top-priority for a student (see AnalyticsSnapshot.lrTopPriorityLogicTypes).
export type LRLogicType =
  | "Analogy (LR)"
  | "Bad authority"
  | "Causal chain"
  | "Causal reasoning"
  | "Circular reasoning"
  | "Conditional reasoning"
  | "Confusing sufficiency and necessity"
  | "Correlation"
  | "Diagram"
  | "Eliminating options"
  | "Equivocation"
  | "False dichotomy"
  | "Internal contradiction"
  | "Kick it up"
  | "Lack of support v. false conclusion"
  | "Link assumption"
  | "Math"
  | "Mental state v. reality"
  | "Misdirected response"
  | "Part v. whole"
  | "Phenomenon-hypothesis (LR)"
  | "Quantifier"
  | "Rule-application"
  | "Sampling"
  | "Source attack"
  | "Time"
  | "Value judgment"
  | "Weighing factors";

export type LRType = LRStemType | LRLogicType;

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
  // Only needs entries for the "regular pool" — Question Stem types plus
  // the 3 Stimulus Logic exceptions. Restricted logic types are gated by
  // lrTopPriorityLogicTypes below, not accuracy.
  lrAccuracyByType: Partial<Record<LRType, number>>;
  // Restricted Stimulus Logic types flagged HIGHEST priority this week —
  // mirrors 7Sage's own priority indicator, not calculated by us.
  lrTopPriorityLogicTypes: LRLogicType[];
}

export interface RulesConfig {
  ptSourceCutoff: number;
  lrQuestionSeconds: number;
  rcPassageSeconds: number;
  ptDurationMinutes: number;
  lrStarredTypes: LRType[];
  lrStemTypes: LRStemType[];
  lrLogicTypes: LRLogicType[];
  // Stimulus Logic types drilled normally despite being "logic" types.
  lrLogicExceptions: LRLogicType[];
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
