export type Tier = "highest" | "medium" | "low";
export type AccuracyRow = { kind: "accuracy"; type: string; read: number | null; value: string };
export type FlagRow = { kind: "flag"; type: string; tier: Tier; on: boolean };
export type ReviewState = {
  lr: AccuracyRow[];
  flags: FlagRow[];
  rc: AccuracyRow[];
  statements: [boolean, boolean];
};

const read = (type: string, value: number): AccuracyRow => ({ kind: "accuracy", type, read: value, value: String(value) });

export const REVIEW_DEMO: ReviewState = {
  lr: [read("Diagram", 64), read("Conditional reasoning", 68), read("Necessary assumption", 71), read("Flaw or descriptive weakening", 74), read("Resolve reconcile or explain", 75)],
  flags: [
    { kind: "flag", type: "Phenomenon-hypothesis (LR)", tier: "highest", on: true },
    { kind: "flag", type: "Link assumption", tier: "medium", on: false },
    { kind: "flag", type: "Causal reasoning", tier: "low", on: false },
  ],
  rc: [read("Law", 58), read("Comparative", 70), read("Science", 64), read("Humanities", 81), read("Art", 77)],
  statements: [false, false],
};

// Test data: nine question types with the longest real names, 0% and 100%, a typo (105), a type the student added,
// a value changed from 100 to 0, every flag switched on, and a passage-type tie for the lowest.
export const REVIEW_WORST: ReviewState = {
  lr: [
    read("Resolve reconcile or explain", 100), read("Flaw or descriptive weakening", 0), read("Necessary + Sufficient assumption", 71),
    { ...read("Conditional reasoning", 100), value: "0" }, { ...read("Diagram", 64), value: "105" }, read("Method of reasoning", 50),
    read("Parallel reasoning", 33), read("Main conclusion", 88), { kind: "accuracy", type: "Principle", read: null, value: "47" },
  ],
  flags: REVIEW_DEMO.flags.map((f) => ({ ...f, on: true })),
  rc: [read("Law", 58), read("Comparative", 58), read("Science", 100), read("Humanities", 0), read("Art", 77)],
  statements: [true, false],
};

export const MISSED_TYPES = ["Strengthen", "Weaken", "Inference", "Principle", "Parallel reasoning", "Method of reasoning", "Main conclusion", "Necessary + Sufficient assumption"];

export const TYPED_START: ReviewState = {
  lr: [],
  flags: [],
  rc: ["Law", "Comparative", "Science", "Humanities", "Art"].map((type) => ({ kind: "accuracy", type, read: null, value: "" })),
  statements: [false, false],
};

export const STATEMENTS = ["I reviewed these values and they match my screenshots.", "These screenshots show my latest 7Sage analytics."] as const;
export const TYPED_STATEMENTS = ["I copied these values from my 7Sage Analytics page.", "These are my latest 7Sage analytics."] as const;

export function valueProblem(row: AccuracyRow): string | null {
  const text = row.value.trim();
  if (text === "") return row.read === null ? "Type the percentage, or remove this row." : "Enter the percentage, or remove this row with ×.";
  const n = Number(text);
  return Number.isInteger(n) && n >= 0 && n <= 100 ? null : "Enter a percentage from 0 to 100.";
}

export function valuesReason(review: ReviewState, typed: boolean, action: "continue" | "confirm"): string | null {
  const rows = [...review.lr, ...review.rc];
  if (typed && rows.every((row) => row.value.trim() === "")) return `Type your values above to ${action}.`;
  const wrong = rows.filter(valueProblem);
  if (wrong.length === 1) return `Fix ${wrong[0].type} above to ${action}.`;
  if (wrong.length > 1) return `Fix ${wrong.length} values above to ${action}.`;
  if (typed && review.lr.length === 0 && !review.flags.some((f) => f.on)) return `Add an accuracy value or tick a flag to ${action}.`;
  return null;
}

export function reviewReason(review: ReviewState, typed: boolean): string | null {
  return valuesReason(review, typed, "confirm") ?? (review.statements.every(Boolean) ? null : "Tick both statements to confirm.");
}
