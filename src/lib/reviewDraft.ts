import {
  accuracyError,
  addRow,
  editAccuracy,
  missingTypes,
  removeRow,
  setStatement,
  toggleTopPriority,
  type ReviewRow,
  type SnapshotReview,
  type Statement,
} from "./analyticsReview";
import type { AnalyticsExtractedRow, LRType, RCType } from "./types";


export type AnalyticsType = LRType | RCType;

export interface ReviewDraft {
  review: SnapshotReview;
  typedText: Partial<Record<AnalyticsType, string>>;
  revealedBoxes: AnalyticsType[];
}

export type ReviewAction =
  | { type: "editAccuracy"; rowType: AnalyticsType; text: string }
  | { type: "leaveAccuracyBox"; rowType: AnalyticsType }
  | { type: "removeRow"; rowType: LRType }
  | { type: "toggleFlag"; rowType: LRType }
  | { type: "addType"; rowType: LRType }
  | { type: "setStatement"; statement: Statement; checked: boolean; at: Date }
  | { type: "confirmBlocked" };

export function startDraft(review: SnapshotReview): ReviewDraft {
  return { review, typedText: {}, revealedBoxes: [] };
}

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
    case "leaveAccuracyBox":
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
    case "addType":
      return { ...draft, review: addRow(review, action.rowType) };
    case "setStatement":
      return { ...draft, review: setStatement(review, action.statement, action.checked, action.at) };
    case "confirmBlocked":
      return revealBoxes(draft, review.rows.filter(({ row }) => accuracyError(row)).map(({ row }) => row.type));
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export type ConfirmLock = { reason: string; fix: { at: "box"; type: AnalyticsType } | { at: "add-type" } | { at: "statements" } };

export function confirmLock(review: SnapshotReview): ConfirmLock | null {
  const wrong = review.rows.filter(({ row }) => accuracyError(row));
  if (wrong.length > 0) {
    const reason = wrong.length === 1 ? `Fix ${wrong[0].row.type} above to confirm.` : `Fix ${wrong.length} values above to confirm.`;
    return { reason, fix: { at: "box", type: wrong[0].row.type } };
  }
  const counts = ({ row }: ReviewRow) =>
    row.category === "regular" ? row.accuracy !== undefined : row.category === "restricted" && row.isTopPriority;
  if (!review.rows.some(counts)) return { reason: "Add an accuracy value or tick a flag to confirm.", fix: { at: "add-type" } };
  if (!review.confirmation.confirmedAt) return { reason: "Tick both statements to confirm.", fix: { at: "statements" } };
  return null;
}

const ACCURACY_MESSAGE = {
  empty: "Enter the percentage, or remove this row with ×.",
  "out-of-range": "Enter a percentage from 0 to 100.",
} as const;

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
  return ACCURACY_MESSAGE[error];
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

export function addTypeOptions(draft: ReviewDraft, query: string): Record<ReviewList, LRType[]> {
  const options: Record<ReviewList, LRType[]> = { accuracy: [], flags: [] };
  const wordStart = new RegExp(`\\b${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  for (const { type, category } of missingTypes(draft.review)) {
    if (!wordStart.test(type)) continue;
    options[category === "regular" ? "accuracy" : "flags"].push(type);
  }
  for (const list of Object.values(options)) list.sort((a, b) => a.localeCompare(b));
  return options;
}
