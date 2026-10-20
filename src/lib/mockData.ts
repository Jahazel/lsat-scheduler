import type { AnalyticsSnapshot, RulesConfig, Student } from "./types";

export const mockRules: RulesConfig = {
  ptSourceCutoff: 130,
  drillSourceCutoff: 130,
  lrQuestionSeconds: 180, // 3:00 drilling pace (untimed, not exam pace)
  rcPassageSeconds: 1035, // 17:15 drilling pace (untimed, not exam pace)
  fullSectionMinutes: 60, // flat, accommodation-scaled — not count × rate
  ptDurationMinutes: 150, // 2.5h
  accommodationTimeMultiplier: { 1: 1, 1.5: 1.25, 2: 1.5 },
  lrStarredTypes: [
    "Conditional reasoning",
    "Flaw or descriptive weakening",
    "Necessary assumption",
    "Strengthen",
    "Sufficient assumption",
    "Weaken",
  ],
  lrStemTypes: [
    "Argument part",
    "Evaluate",
    "Except (LR)",
    "Fill in the blank",
    "Flaw or descriptive weakening",
    "Inference",
    "Main conclusion or main point",
    "Method of reasoning or descriptive",
    "Miscellaneous (LR)",
    "Most strongly supported",
    "Must be false",
    "Must be true",
    "Necessary assumption",
    "PSA - find or complete the application",
    "PSA - find the rule",
    "Parallel flawed method of reasoning",
    "Parallel method of reasoning",
    "Point at issue: agree",
    "Point at issue: disagree",
    "Principle",
    "Resolve reconcile or explain",
    "Strengthen",
    "Sufficient assumption",
    "Weaken",
  ],
  lrLogicTypes: [
    "Analogy (LR)",
    "Bad authority",
    "Causal chain",
    "Causal reasoning",
    "Circular reasoning",
    "Conditional reasoning",
    "Confusing sufficiency and necessity",
    "Correlation",
    "Diagram",
    "Eliminating options",
    "Equivocation",
    "False dichotomy",
    "Internal contradiction",
    "Kick it up",
    "Lack of support v. false conclusion",
    "Link assumption",
    "Math",
    "Mental state v. reality",
    "Misdirected response",
    "Part v. whole",
    "Phenomenon-hypothesis (LR)",
    "Quantifier",
    "Rule-application",
    "Sampling",
    "Source attack",
    "Time",
    "Value judgment",
    "Weighing factors",
  ],
  lrLogicExceptions: ["Diagram", "Math", "Conditional reasoning"],
  lrPairedTypes: [
    ["Strengthen", "Weaken"],
    ["Flaw or descriptive weakening", "Weaken"],
    ["Strengthen", "Most strongly supported"],
    ["Must be true", "Must be false"],
    ["Parallel flawed method of reasoning", "Parallel method of reasoning"],
    ["Sufficient assumption", "Necessary assumption"],
  ],
  rcTypes: ["Art", "Humanities", "Science", "Law", "Comparative"],
  lrUnitSizes: { small: 5, medium: 10 },
  rcTwoPassageDifficultyCombos: [
    [2, 4],
    [3, 5],
    [3, 4],
  ],
  lrDifficultyCutoffScore: 165,
  restDay: "WEDNESDAY",
};

export const mockStudentName = "Jordan Rivera";

export const mockStudent: Student = {
  currentScore: 160,
  goalScore: 170,
  dailyCapacityMinutes: {
    MONDAY: 90,
    TUESDAY: 90,
    WEDNESDAY: 90,
    THURSDAY: 90,
    FRIDAY: 90,
    SATURDAY: 90,
    SUNDAY: 90,
  },
  preferredPracticeTestDay: "SATURDAY",
  accommodationMultiplier: 1,
  goalTestDate: "2027-01-01", // January 2027
};

// Deliberately uneven so weakest-first is visibly exercised beyond the
// starred types' guaranteed floor. Lower value = weaker. Only the regular
// pool (Question Stem types + the 3 logic exceptions) needs accuracy —
// restricted logic types are gated by lrTopPriorityLogicTypes instead.
export const mockAnalytics: AnalyticsSnapshot = {
  weekOf: "2026-08-24",
  lrAccuracyByType: {
    "Argument part": 0.62,
    Evaluate: 0.55,
    "Except (LR)": 0.72,
    "Fill in the blank": 0.8,
    "Flaw or descriptive weakening": 0.71,
    Inference: 0.65,
    "Main conclusion or main point": 0.88,
    "Method of reasoning or descriptive": 0.6,
    "Miscellaneous (LR)": 0.5,
    "Most strongly supported": 0.68,
    "Must be false": 0.52,
    "Must be true": 0.75,
    "Necessary assumption": 0.58,
    "PSA - find or complete the application": 0.66,
    "PSA - find the rule": 0.63,
    "Parallel flawed method of reasoning": 0.4,
    "Parallel method of reasoning": 0.45,
    "Point at issue: agree": 0.77,
    "Point at issue: disagree": 0.73,
    Principle: 0.7,
    "Resolve reconcile or explain": 0.66,
    Strengthen: 0.64,
    "Sufficient assumption": 0.5,
    Weaken: 0.61,
    Diagram: 0.35,
    Math: 0.3,
    "Conditional reasoning": 0.58,
  },
  // Mirrors the real 7Sage screenshot we were shown, where this was the one
  // type flagged HIGHEST priority.
  lrTopPriorityLogicTypes: ["Phenomenon-hypothesis (LR)"],
};
