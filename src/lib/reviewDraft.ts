import {
  accuracyError,
  addRow,
  editAccuracy,
  missingTypes,
  isTyped,
  removeRow,
  setStatement,
  setTier,
  startTypedReview,
  tierMissing,
  toggleTopPriority,
  type ReviewRow,
  type SnapshotReview,
  type Statement,
} from "./analyticsReview";
import type { AnalyticsExtractedRow, LRType, PriorityTier, RCType } from "./types";


export type AnalyticsType = LRType | RCType;

export interface ReviewDraft {
  review: SnapshotReview;
  typedText: Partial<Record<AnalyticsType, string>>;
  revealedBoxes: AnalyticsType[];
}

export type ReviewAction =
  | { type: "editAccuracy"; rowType: AnalyticsType; text: string }
  | { type: "leaveRow"; rowType: AnalyticsType }
  | { type: "removeRow"; rowType: LRType }
  | { type: "toggleFlag"; rowType: LRType }
  | { type: "setTier"; rowType: LRType; tier: PriorityTier }
  | { type: "addType"; rowType: LRType }
  | { type: "setStatement"; statement: Statement; checked: boolean; at: Date }
  | { type: "confirmBlocked" };

export function startDraft(review: SnapshotReview): ReviewDraft {
  return { review, typedText: {}, revealedBoxes: [] };
}

export function startTypedDraft(at: Date): ReviewDraft {
  return startDraft(startTypedReview(at));
}

const rowWrong = (review: SnapshotReview, row: ReviewRow["row"]) => accuracyError(row) !== null || tierMissing(review, row);

const PERCENTAGE = /^\d+(\.\d+)?$/;

const rowIndex = (review: SnapshotReview, type: AnalyticsType) => review.rows.findIndex(({ row }) => row.type === type);

function revealBoxes(draft: ReviewDraft, types: AnalyticsType[]): ReviewDraft {
  return { ...draft, revealedBoxes: [...new Set([...draft.revealedBoxes, ...types])] };
}

export function reviewDraftReducer(draft: ReviewDraft, action: ReviewAction): ReviewDraft {
  const { review } = draft;
  switch (action.type) {
    case "editAccuracy": {
      const { rowType, text } = action;
      const accuracy = text === "" ? undefined : PERCENTAGE.test(text) ? Number(text) : NaN;
      return {
        ...draft,
        review: editAccuracy(review, rowIndex(review, rowType), accuracy),
        typedText: { ...draft.typedText, [rowType]: text },
      };
    }
    case "leaveRow":
      return revealBoxes(draft, [action.rowType]);
    case "removeRow": {
      const index = rowIndex(review, action.rowType);
      if (index === -1) return draft;
      const typedText = { ...draft.typedText };
      delete typedText[action.rowType];
      return { ...draft, review: removeRow(review, index), typedText };
    }
    case "toggleFlag":
      return { ...draft, review: toggleTopPriority(review, rowIndex(review, action.rowType)) };
    case "setTier":
      return { ...draft, review: setTier(review, rowIndex(review, action.rowType), action.tier) };
    case "addType":
      return { ...draft, review: addRow(review, action.rowType) };
    case "setStatement":
      return { ...draft, review: setStatement(review, action.statement, action.checked, action.at) };
    case "confirmBlocked":
      return revealBoxes(draft, review.rows.filter(({ row }) => rowWrong(review, row)).map(({ row }) => row.type));
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export type ReviewLock = {
  reason: string;
  fix: { at: "box"; type: AnalyticsType } | { at: "tier"; type: LRType } | { at: "add-type" } | { at: "statements" };
};

type LockAction = "confirm" | "continue";

function emptyReason(review: SnapshotReview, action: LockAction) {
  if (!isTyped(review)) return `Add an accuracy value or tick a flag to ${action}.`;
  return review.rows.some(({ row }) => row.category !== "passage")
    ? `Add a percentage or a Highest tier to ${action}.`
    : `Add a Logical Reasoning type to ${action}.`;
}

export const ANALYTICS_INPUTS = [
  { value: "screenshots", label: "Screenshots" },
  { value: "typed", label: "Type them" },
] as const;
export type AnalyticsInput = (typeof ANALYTICS_INPUTS)[number]["value"];

export function analyticsInputs(scanningOff: boolean) {
  return ANALYTICS_INPUTS.map((option) => ({ ...option, disabled: scanningOff && option.value === "screenshots" }));
}

function valueLock(review: SnapshotReview, action: LockAction): ReviewLock | null {
  const wrong = review.rows.filter(({ row }) => rowWrong(review, row));
  if (wrong.length > 0) {
    const reason = wrong.length === 1 ? `Fix ${wrong[0].row.type} above to ${action}.` : `Fix ${wrong.length} values above to ${action}.`;
    const { row } = wrong[0];
    return { reason, fix: row.category === "restricted" ? { at: "tier", type: row.type } : { at: "box", type: row.type } };
  }
  const counts = ({ row }: ReviewRow) =>
    row.category === "regular" ? row.accuracy !== undefined : row.category === "restricted" && row.isTopPriority;
  if (!review.rows.some(counts)) return { reason: emptyReason(review, action), fix: { at: "add-type" } };
  return null;
}

export function typedEntryProblem(review: SnapshotReview): string | null {
  return valueLock(review, "continue")?.reason ?? null;
}

export function confirmLock(review: SnapshotReview): ReviewLock | null {
  const lock = valueLock(review, "confirm");
  if (lock) return lock;
  if (!review.confirmation.confirmedAt) return { reason: "Tick both statements to confirm.", fix: { at: "statements" } };
  return null;
}

const ACCURACY_MESSAGE = {
  empty: "Enter the percentage, or remove this row with ×.",
  "out-of-range": "Enter a percentage from 0 to 100.",
} as const;
const TYPED_EMPTY = "Type the percentage, or remove this row.";

export function boxText(draft: ReviewDraft, type: AnalyticsType): string {
  const typed = draft.typedText[type];
  if (typed !== undefined) return typed;
  return String(draft.review.rows.find(({ row }) => row.type === type)?.row.accuracy ?? "");
}

export function accuracyMessage(draft: ReviewDraft, type: AnalyticsType): string | null {
  if (!draft.revealedBoxes.includes(type)) return null;
  const entry = draft.review.rows.find(({ row }) => row.type === type);
  const error = entry && accuracyError(entry.row);
  if (!error) return null;
  return error === "empty" && isTyped(draft.review) ? TYPED_EMPTY : ACCURACY_MESSAGE[error];
}

export function tierMessage(draft: ReviewDraft, type: LRType): string | null {
  if (!draft.revealedBoxes.includes(type)) return null;
  const entry = draft.review.rows.find(({ row }) => row.type === type);
  return entry && tierMissing(draft.review, entry.row) ? "Pick the tier 7Sage shows, or remove this row." : null;
}

export type ReviewList = "accuracy" | "flags";
const LIST_CATEGORY = { accuracy: "regular", flags: "restricted" } as const;
const EMPTY_LIST_NOTE: Record<ReviewList, string> = {
  accuracy: "We didn't find accuracy values in your LR screenshot. If 7Sage shows any, add them with the link below.",
  flags: "We didn't find priority flags in your LR screenshot. If 7Sage shows any, add them with the link below.",
};

export function emptyListNote(draft: ReviewDraft, lrRead: AnalyticsExtractedRow[], list: ReviewList): string | null {
  const inList = ({ category }: AnalyticsExtractedRow) => category === LIST_CATEGORY[list];
  if (lrRead.some(inList) || draft.review.rows.some(({ row }) => inList(row))) return null;
  return EMPTY_LIST_NOTE[list];
}

const wordStart = (query: string) => new RegExp(`\\b${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");

export function addTypeOptions(draft: ReviewDraft, query: string): Record<ReviewList, LRType[]> {
  const options: Record<ReviewList, LRType[]> = { accuracy: [], flags: [] };
  const matches = wordStart(query);
  for (const { type, category } of missingTypes(draft.review)) {
    if (!matches.test(type)) continue;
    options[category === "regular" ? "accuracy" : "flags"].push(type);
  }
  for (const list of Object.values(options)) list.sort((a, b) => a.localeCompare(b));
  return options;
}

export function listedTypes(draft: ReviewDraft, query: string): LRType[] {
  if (query.trim() === "") return [];
  const matches = wordStart(query);
  return draft.review.rows.flatMap(({ row }) => (row.category !== "passage" && matches.test(row.type) ? [row.type] : []));
}
