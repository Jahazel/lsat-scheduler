import { describe, expect, it } from "vitest";
import type { AnalyticsExtractedRow } from "./types";
import {
  accuracyError,
  hasInvalidAccuracy,
  addRow,
  dropSection,
  editAccuracy,
  lowestPassageType,
  missingTypes,
  readSection,
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

const passages: AnalyticsExtractedRow[] = [
  { type: "Law", category: "passage", accuracy: 58 },
  { type: "Comparative", category: "passage", accuracy: 70 },
  { type: "Science", category: "passage", accuracy: 64 },
  { type: "Humanities", category: "passage", accuracy: 81 },
  { type: "Art", category: "passage", accuracy: 77 },
];

function extracted() {
  return startReview(
    [
      { type: "Strengthen", category: "regular", accuracy: 68 },
      { type: "Conditional reasoning", category: "restricted", isTopPriority: true },
      ...passages,
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
    expect(reviewedRows(removeRow(extracted(), 0)).map((row) => row.type)).toEqual(["Conditional reasoning", "Law", "Comparative", "Science", "Humanities", "Art"]);
  });

  it("adds a missing type with its category and no original value", () => {
    const review = addRow(extracted(), "Weaken");
    expect(review.rows.at(-1)).toEqual({ row: { type: "Weaken", category: "regular" }, original: null });
    expect(missingTypes(review).map((t) => t.type)).not.toContain("Weaken");
  });

  it("does not add a type that is already listed", () => {
    expect(addRow(extracted(), "Strengthen").rows).toHaveLength(7);
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
    const review = confirm(editAccuracy(extracted(), 0, accuracy));
    expect(hasInvalidAccuracy(review)).toBe(true);
    expect(snapshotApproval(review)).toBeNull();
  });

  it("clears both statements when a value changes", () => {
    const review = toggleTopPriority(confirm(extracted()), 1);
    expect(review.confirmation).toEqual({ extractedValuesMatch: false, isLatestAnalytics: false, confirmedAt: null });
    expect(snapshotApproval(review)).toBeNull();
  });

  it("clears approval when a statement is unticked", () => {
    expect(snapshotApproval(setStatement(confirm(extracted()), "isLatestAnalytics", false))).toBeNull();
  });
});

describe("RC passage types", () => {
  const lrRead = { source: "7sage_screenshot", extractedAt: "2026-10-18T12:00:00.000Z" } as const;
  const rcRead = { source: "7sage_screenshot", extractedAt: "2026-10-18T12:02:00.000Z" } as const;
  const lrRows: AnalyticsExtractedRow[] = [{ type: "Strengthen", category: "regular", accuracy: 68 }];

  it("lists all 5 passage types in 7Sage order, with an empty row for a type the read missed that does not block approval", () => {
    const review = readSection(readSection(null, "LR", lrRows, lrRead), "RC", passages.slice(0, 4).reverse(), rcRead);
    expect(review.rows.map(({ row, original }) => [row.type, row.accuracy, original === null])).toEqual([
      ["Strengthen", 68, false],
      ["Law", 58, false],
      ["Comparative", 70, false],
      ["Science", 64, false],
      ["Humanities", 81, false],
      ["Art", undefined, true],
    ]);
    expect(accuracyError(review.rows[5].row)).toBeNull();
    expect(snapshotApproval(confirm(review))).not.toBeNull();
    expect(snapshotApproval(confirm(editAccuracy(review, 5, 101)))).toBeNull();
  });

  it("keeps the other section's edits when one screenshot is read again", () => {
    const edited = editAccuracy(readSection(readSection(null, "LR", lrRows, lrRead), "RC", passages, rcRead), 0, 75);
    const reread = readSection(edited, "RC", passages, { ...rcRead, extractedAt: "2026-10-18T12:09:00.000Z" });
    expect(reread.rows[0].row.accuracy).toBe(75);
    expect(reread.extraction.extractedAt).toBe(lrRead.extractedAt);
  });

  it("dates the approval from the older of the two reads that are still on the review", () => {
    const both = readSection(readSection(null, "LR", lrRows, lrRead), "RC", passages, rcRead);
    expect(both.extraction.extractedAt).toBe(lrRead.extractedAt);
    const rcOnly = dropSection(both, "LR")!;
    expect(rcOnly.extraction.extractedAt).toBe(rcRead.extractedAt);
    expect(readSection(rcOnly, "LR", lrRows, { ...lrRead, extractedAt: "2026-10-18T12:30:00.000Z" }).extraction.extractedAt)
      .toBe(rcRead.extractedAt);
    expect(dropSection(rcOnly, "RC")).toBeNull();
  });

  it("validates passage accuracy like LR accuracy", () => {
    expect(accuracyError({ type: "Law", category: "passage", accuracy: 101 })).toBe("out-of-range");
    expect(accuracyError({ type: "Law", category: "passage", accuracy: 0 })).toBeNull();
  });

  it("approves an RC read with no passage-type percentage", () => {
    const review = readSection(readSection(null, "LR", lrRows, lrRead), "RC", [], rcRead);
    expect(review.rows.filter(({ row }) => row.category === "passage")).toHaveLength(5);
    expect(snapshotApproval(confirm(review))).not.toBeNull();
  });

  it("marks the lowest passage type, with ties in rules-list order", () => {
    expect(lowestPassageType(extracted())).toBe("Law");
    const tied = readSection(null, "RC", passages.map((row) => ({ ...row, accuracy: 60 })), rcRead);
    expect(lowestPassageType(tied)).toBe("Art");
    expect(lowestPassageType(readSection(null, "RC", [], rcRead))).toBeNull();
    expect(lowestPassageType(readSection(null, "RC", passages.slice(3), rcRead))).toBe("Art");
  });

  it("never offers a passage type in the add-a-type list", () => {
    expect(missingTypes(readSection(null, "RC", [], rcRead)).map(({ type }): string => type)).not.toContain("Law");
  });
});
