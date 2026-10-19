import { mockRules } from "@/lib/mockData";
import type { SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import type { AnalyticsExtractedRow, LRType } from "@/lib/types";

// Every type a reviewer can add by hand, tagged with the same "regular" /
// "restricted" split the engine uses.
export type ReviewType = Pick<AnalyticsExtractedRow, "type" | "category">;

const REVIEW_TYPES: ReviewType[] = [
  ...mockRules.lrStemTypes.map((type) => ({ type, category: "regular" as const })),
  ...mockRules.lrLogicTypes.map((type) => ({
    type,
    category: mockRules.lrLogicExceptions.includes(type) ? ("regular" as const) : ("restricted" as const),
  })),
];

export type Statement = keyof Omit<SnapshotApprovalMetadata["confirmation"], "confirmedAt">;

export interface ReviewRow {
  row: AnalyticsExtractedRow;
  /** null when the reviewer added the row instead of the extraction. */
  original: AnalyticsExtractedRow | null;
}

export type ReviewConfirmation =
  | (Record<Statement, boolean> & { confirmedAt: null })
  | SnapshotApprovalMetadata["confirmation"];

export interface SnapshotReview {
  extraction: SnapshotApprovalMetadata["extraction"];
  rows: ReviewRow[];
  confirmation: ReviewConfirmation;
}

const UNCONFIRMED: ReviewConfirmation = { extractedValuesMatch: false, isLatestAnalytics: false, confirmedAt: null };

export type AccuracyError = "empty" | "out-of-range";

export function startReview(rows: AnalyticsExtractedRow[], extraction: SnapshotReview["extraction"]): SnapshotReview {
  return {
    extraction,
    rows: rows.map((row) => ({ row, original: row })),
    confirmation: UNCONFIRMED,
  };
}

function withRowsUnconfirmed(review: SnapshotReview, rows: ReviewRow[]): SnapshotReview {
  return { ...review, rows, confirmation: UNCONFIRMED };
}

function updateRow(review: SnapshotReview, index: number, update: (row: AnalyticsExtractedRow) => AnalyticsExtractedRow) {
  return withRowsUnconfirmed(review, review.rows.map((entry, i) => (i === index ? { ...entry, row: update(entry.row) } : entry)));
}

export function editAccuracy(review: SnapshotReview, index: number, accuracy: number | undefined) {
  return updateRow(review, index, (row) => ({ ...row, accuracy }));
}

export function toggleTopPriority(review: SnapshotReview, index: number) {
  return updateRow(review, index, (row) => ({ ...row, isTopPriority: !row.isTopPriority }));
}

export function removeRow(review: SnapshotReview, index: number) {
  return withRowsUnconfirmed(review, review.rows.filter((_, i) => i !== index));
}

export function missingTypes(review: SnapshotReview): ReviewType[] {
  return REVIEW_TYPES.filter((t) => !review.rows.some(({ row }) => row.type === t.type));
}

export function addRow(review: SnapshotReview, type: LRType) {
  const match = missingTypes(review).find((t) => t.type === type);
  if (!match) return review;
  return withRowsUnconfirmed(review, [...review.rows, { row: { ...match }, original: null }]);
}

export function setStatement(review: SnapshotReview, statement: Statement, checked: boolean, now = new Date()): SnapshotReview {
  const { extractedValuesMatch, isLatestAnalytics }: Record<Statement, boolean> = { ...review.confirmation, [statement]: checked };
  const confirmation: ReviewConfirmation = extractedValuesMatch && isLatestAnalytics
    ? { extractedValuesMatch, isLatestAnalytics, confirmedAt: now.toISOString() }
    : { extractedValuesMatch, isLatestAnalytics, confirmedAt: null };
  return { ...review, confirmation };
}

export function accuracyError(row: AnalyticsExtractedRow): AccuracyError | null {
  if (row.category !== "regular") return null;
  if (row.accuracy === undefined) return "empty";
  if (!Number.isFinite(row.accuracy) || row.accuracy < 0 || row.accuracy > 100) return "out-of-range";
  return null;
}

export function reviewedRows(review: SnapshotReview): AnalyticsExtractedRow[] {
  return review.rows.map(({ row }) => row);
}

export function hasInvalidAccuracy(review: SnapshotReview) {
  return review.rows.some(({ row }) => accuracyError(row));
}

export function snapshotApproval(review: SnapshotReview): SnapshotApprovalMetadata | null {
  if (review.confirmation.confirmedAt === null || hasInvalidAccuracy(review)) return null;
  return { extraction: review.extraction, confirmation: review.confirmation };
}
