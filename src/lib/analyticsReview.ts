import { mockRules } from "@/lib/mockData";
import type { SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import type { AnalyticsExtractedRow, AnalyticsSection, LRExtractedRow, LRType, PassageExtractedRow, RCType } from "@/lib/types";

// Every type a reviewer can add by hand, tagged with the same "regular" /
// "restricted" split the engine uses.
export type ReviewType = Pick<LRExtractedRow, "type" | "category">;

const REVIEW_TYPES: ReviewType[] = [
  ...mockRules.lrStemTypes.map((type) => ({ type, category: "regular" as const })),
  ...mockRules.lrLogicTypes.map((type) => ({
    type,
    category: mockRules.lrLogicExceptions.includes(type) ? ("regular" as const) : ("restricted" as const),
  })),
];

// The order 7Sage lists RC passage types, so each row lines up with the screenshot.
export const PASSAGE_TYPES: RCType[] = ["Law", "Comparative", "Science", "Humanities", "Art"];

export const SECTIONS: AnalyticsSection[] = ["LR", "RC"];
export const SECTION_NAME: Record<AnalyticsSection, string> = { LR: "Logical Reasoning", RC: "Reading Comprehension" };

export const sectionOf = (row: AnalyticsExtractedRow): AnalyticsSection => (row.category === "passage" ? "RC" : "LR");

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
  readAt?: Partial<Record<AnalyticsSection, string>>;
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

export function readSection(
  review: SnapshotReview | null,
  section: AnalyticsSection,
  rows: AnalyticsExtractedRow[],
  extraction: SnapshotReview["extraction"],
): SnapshotReview {
  const read: ReviewRow[] = section === "RC"
    ? PASSAGE_TYPES.map((type) => {
        const found = rows.find((row): row is PassageExtractedRow => row.category === "passage" && row.type === type);
        return found ? { row: found, original: found } : { row: { type, category: "passage" }, original: null };
      })
    : rows.filter((row) => sectionOf(row) === "LR").map((row) => ({ row, original: row }));
  const kept = review?.rows.filter(({ row }) => sectionOf(row) !== section) ?? [];
  const readAt = { ...review?.readAt, [section]: extraction.extractedAt };
  const extractedAt = Object.values(readAt).sort()[0];
  return {
    extraction: { ...extraction, extractedAt },
    readAt,
    rows: section === "LR" ? [...read, ...kept] : [...kept, ...read],
    confirmation: UNCONFIRMED,
  };
}

export function dropSection(review: SnapshotReview, section: AnalyticsSection): SnapshotReview | null {
  const rows = review.rows.filter(({ row }) => sectionOf(row) !== section);
  if (rows.length === 0) return null;
  const readAt = { ...review.readAt };
  delete readAt[section];
  const extractedAt = Object.values(readAt).sort()[0] ?? review.extraction.extractedAt;
  return { extraction: { ...review.extraction, extractedAt }, readAt, rows, confirmation: UNCONFIRMED };
}

export function lowestPassageType(review: SnapshotReview): RCType | null {
  const passages = review.rows
    .map(({ row }) => row)
    .filter((row): row is PassageExtractedRow & { accuracy: number } => row.category === "passage" && !accuracyError(row));
  passages.sort((a, b) => a.accuracy - b.accuracy || mockRules.rcTypes.indexOf(a.type) - mockRules.rcTypes.indexOf(b.type));
  return passages[0]?.type ?? null;
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
  return updateRow(review, index, (row) => (row.category === "restricted" ? { ...row, isTopPriority: !row.isTopPriority } : row));
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
  if (row.category === "restricted") return null;
  if (row.accuracy === undefined) return "empty";
  if (!Number.isFinite(row.accuracy) || row.accuracy < 0 || row.accuracy > 100) return "out-of-range";
  return null;
}

export function reviewedRows(review: SnapshotReview): AnalyticsExtractedRow[] {
  return review.rows.map(({ row }) => row);
}

export function hasAllPassageTypes(review: SnapshotReview) {
  return PASSAGE_TYPES.every((type) => review.rows.some(({ row }) => row.type === type));
}

export function hasInvalidAccuracy(review: SnapshotReview) {
  return review.rows.some(({ row }) => accuracyError(row));
}

export function snapshotApproval(review: SnapshotReview): SnapshotApprovalMetadata | null {
  if (review.confirmation.confirmedAt === null || hasInvalidAccuracy(review) || !hasAllPassageTypes(review)) return null;
  return { extraction: review.extraction, confirmation: review.confirmation };
}
