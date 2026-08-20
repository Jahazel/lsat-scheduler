import type { AnalyticsSnapshot, RulesConfig, Student } from "./types";

export const mockRules: RulesConfig = {
  ptSourceCutoff: 130,
  lrQuestionSeconds: 75, // 1:15
  rcPassageSeconds: 525, // 8:45
  ptDurationMinutes: 150, // 2.5h
  lrStarredTypes: [
    "Flaw",
    "Must Be True",
    "Necessary Assumption",
    "Strengthen",
    "Sufficient Assumption",
    "Weaken",
  ],
  lrAllTypes: [
    "Argument Part",
    "Evaluate",
    "Flaw",
    "Main Conclusion",
    "Method of Reasoning",
    "Most Strongly Supported",
    "Must Be True",
    "Must Be False",
    "Necessary Assumption",
    "Parallel Flawed Method of Reasoning",
    "Parallel Method of Reasoning",
    "Principle",
    "Resolve Reconcile or Explain",
    "Strengthen",
    "Sufficient Assumption",
    "Weaken",
    "Diagram",
    "Math",
  ],
  rcTypes: ["Art", "Humanities", "Science", "Law", "Comparative"],
  lrUnitSizes: { small: 5, medium: 10, fullSection: 25 },
  rcUnitSizes: { small: 1, medium: 2, fullSection: 4 },
  lrDifficultyCutoffScore: 165,
  reviewPercentByBand: { below160: 1.0, mid: 0.6, above170: 0.5 },
  restDay: "WEDNESDAY",
};

export const mockStudent: Student = {
  name: "Jordan Rivera",
  platform: "7Sage",
  weekdayHours: 1.5,
  weekendHours: 1.5,
  accommodationMultiplier: 1,
};

// Deliberately uneven so weakest-first is visibly exercised beyond the
// starred types' guaranteed floor. Lower value = weaker.
export const mockAnalytics: AnalyticsSnapshot = {
  weekOf: "2026-08-24",
  currentScore: 160,
  lrAccuracyByType: {
    "Argument Part": 0.62,
    Evaluate: 0.55,
    Flaw: 0.71,
    "Main Conclusion": 0.88,
    "Method of Reasoning": 0.6,
    "Most Strongly Supported": 0.68,
    "Must Be True": 0.75,
    "Must Be False": 0.52,
    "Necessary Assumption": 0.58,
    "Parallel Flawed Method of Reasoning": 0.4,
    "Parallel Method of Reasoning": 0.45,
    Principle: 0.7,
    "Resolve Reconcile or Explain": 0.66,
    Strengthen: 0.64,
    "Sufficient Assumption": 0.5,
    Weaken: 0.61,
    Diagram: 0.35,
    Math: 0.3,
  },
};
