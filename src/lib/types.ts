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
  platform: "7Sage" | "LSAT Demon";
  currentScore: number;
  goalScore: number;
  weekdayHours: number;
  weekendHours: number;
  accommodationMultiplier: 1 | 1.5 | 2;
  // ISO date (YYYY-MM-DD, always the 1st of one of a fixed set of test
  // months). Captured at intake; not currently a scheduling input — every
  // plan is the same fixed 1 rest / 1 PT / 1 review / 4 drill shape
  // regardless of proximity to test day. Surfaced today only as a "weeks
  // until test" readout.
  goalTestDate: string;
}

// A persisted Student, as returned by the API — adds the database id and
// the display name/email of the User account it belongs to.
export interface StudentRecord extends Student {
  id: string;
  userId: string;
  name: string;
  email: string;
}

export interface AnalyticsSnapshot {
  weekOf: string;
  // Only needs entries for the "regular pool" — Question Stem types plus
  // the 3 Stimulus Logic exceptions. Restricted logic types are gated by
  // lrTopPriorityLogicTypes below, not accuracy.
  lrAccuracyByType: Partial<Record<LRType, number>>;
  // Restricted Stimulus Logic types flagged HIGHEST priority this week —
  // mirrors 7Sage's own priority indicator, not calculated by us.
  lrTopPriorityLogicTypes: LRLogicType[];
}

// A persisted Analytics Snapshot, as returned by the API — adds the
// database id and which student it belongs to.
export interface AnalyticsSnapshotRecord extends AnalyticsSnapshot {
  id: string;
  studentId: string;
  status: "approved" | "legacy";
  approvedAt?: string;
  extraction?: {
    source: "7sage_screenshot";
    extractedAt: string;
  };
  confirmation?: {
    extractedValuesMatch: true;
    isLatestAnalytics: true;
    confirmedAt: string;
  };
  legacy?: {
    migratedAt: string;
    source: "single-snapshot-storage";
  };
}

// One row of OCR-extracted analytics data, before it's been reviewed and
// saved. "regular" rows carry an accuracy read off the screenshot;
// "restricted" rows carry whether that row was flagged HIGHEST priority.
export interface AnalyticsExtractedRow {
  type: LRType;
  category: "regular" | "restricted";
  accuracy?: number;
  isTopPriority?: boolean;
}

export interface RulesConfig {
  ptSourceCutoff: number;
  // Drilling always pulls from below this PT number — the mirror image of
  // ptSourceCutoff, which is where the one weekly timed PT pulls from.
  drillSourceCutoff: number;
  lrQuestionSeconds: number;
  rcPassageSeconds: number;
  // Flat length of a full-section drill (LR or RC alike) — real section
  // time, not the per-question/per-passage drilling rate times the count.
  fullSectionMinutes: number;
  ptDurationMinutes: number;
  // A student's accommodation category (their actual extra-time %) maps to
  // a smaller applied time multiplier — 150% extra time only stretches
  // scheduled blocks by 125%, 200% only by 150%.
  accommodationTimeMultiplier: Record<1 | 1.5 | 2, number>;
  lrStarredTypes: LRType[];
  lrStemTypes: LRStemType[];
  lrLogicTypes: LRLogicType[];
  // Stimulus Logic types drilled normally despite being "logic" types.
  lrLogicExceptions: LRLogicType[];
  // Commonly-paired LR types — when the weakest-first rotation lands a
  // 10-question drill on one of these, it splits 5+5 across the pair
  // instead of drilling 10 of just the one type.
  lrPairedTypes: [LRType, LRType][];
  rcTypes: RCType[];
  lrUnitSizes: { small: number; medium: number; fullSection: number };
  rcUnitSizes: { small: number; medium: number; fullSection: number };
  // Cycled through, in order, every time a 2-passage RC drill comes up —
  // each pair is [lower, higher] and both levels always exclude L1.
  rcTwoPassageDifficultyCombos: [number, number][];
  lrDifficultyCutoffScore: number;
  reviewPercentByBand: { below160: number; mid: number; above170: number };
  restDay: DayOfWeek;
  // A drilling day's total (drill + review) should land at or within this
  // many minutes of the student's stated capacity for that day — on either
  // side, not just under.
  capacityToleranceMinutes: number;
}

export interface LRActivity {
  kind: "LR";
  type: LRType;
  questionCount: number;
  difficultyRange: string;
  drillMinutes: number;
  reviewMinutes: number;
  // The week's one full section, when this is it — renders as its own
  // summary line rather than a numbered drill (a real section spans many
  // types, so type/questionCount here aren't meaningful for display).
  isFullSection: boolean;
}

export interface RCActivity {
  kind: "RC";
  type: RCType;
  passageCount: number;
  difficultyLevel: number;
  drillMinutes: number;
  reviewMinutes: number;
  // See LRActivity.isFullSection.
  isFullSection: boolean;
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
