import { describe, expect, it } from "vitest";
import {
  accuracyError,
  addRow,
  editAccuracy,
  missingTypes,
  removeRow,
  reviewedRows,
  setStatement,
  snapshotApproval,
  startReview,
  toggleTopPriority,
  type SnapshotReview,
} from "./analyticsReview";

const extraction = { source: "7sage_screenshot", extractedAt: "2026-10-18T12:00:00.000Z" } as const;
const confirmedAt = new Date("2026-10-18T12:05:00.000Z");

function extracted() {
  return startReview(
    [
      { type: "Strengthen", category: "regular", accuracy: 68 },
      { type: "Conditional reasoning", category: "restricted", isTopPriority: true },
    ],
    extraction,
  );
}

function confirm(review: SnapshotReview) {
  return setStatement(setStatement(review, "extractedValuesMatch", true, confirmedAt), "isLatestAnalytics", true, confirmedAt);
}

describe("analytics review", () => {
  it("keeps each row's original value after an edit", () => {
    const review = editAccuracy(extracted(), 0, 75);
    expect(review.rows[0].row.accuracy).toBe(75);
    expect(review.rows[0].original?.accuracy).toBe(68);
  });

  it.each([
    [101, "out-of-range"],
    [-1, "out-of-range"],
    [Number.NaN, "out-of-range"],
    [undefined, "empty"],
    [0, null],
    [100, null],
  ] as const)("validates accuracy %s as %s", (accuracy, error) => {
    expect(accuracyError(editAccuracy(extracted(), 0, accuracy).rows[0].row)).toBe(error);
  });

  it("does not validate accuracy on priority rows", () => {
    expect(accuracyError(extracted().rows[1].row)).toBeNull();
  });

  it("removes a row", () => {
    expect(reviewedRows(removeRow(extracted(), 0)).map((row) => row.type)).toEqual(["Conditional reasoning"]);
  });

  it("adds a missing type with its category and no original value", () => {
    const review = addRow(extracted(), "Weaken");
    expect(review.rows.at(-1)).toEqual({ row: { type: "Weaken", category: "regular" }, original: null });
    expect(missingTypes(review)).not.toContain("Weaken");
  });

  it("does not add a type that is already listed", () => {
    expect(addRow(extracted(), "Strengthen").rows).toHaveLength(2);
  });

  it("returns approval only after both statements are ticked", () => {
    const review = extracted();
    expect(snapshotApproval(review)).toBeNull();
    expect(snapshotApproval(setStatement(review, "extractedValuesMatch", true, confirmedAt))).toBeNull();
    expect(snapshotApproval(setStatement(review, "isLatestAnalytics", true, confirmedAt))).toBeNull();
    expect(snapshotApproval(confirm(review))).toEqual({
      extraction,
      confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: confirmedAt.toISOString() },
    });
  });

  it.each([101, undefined])("returns no approval while a value is invalid (%s)", (accuracy) => {
    expect(snapshotApproval(confirm(editAccuracy(extracted(), 0, accuracy)))).toBeNull();
  });

  it("clears both statements when a value changes", () => {
    const review = toggleTopPriority(confirm(extracted()), 1);
    expect(review.statements).toEqual({ extractedValuesMatch: false, isLatestAnalytics: false });
    expect(snapshotApproval(review)).toBeNull();
  });

  it("clears approval when a statement is unticked", () => {
    expect(snapshotApproval(setStatement(confirm(extracted()), "isLatestAnalytics", false))).toBeNull();
  });
});
