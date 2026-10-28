import { describe, expect, it } from "vitest";
import { reviewedRows, snapshotApproval } from "./analyticsReview";
import { accuracyMessage, confirmLock, reviewDraftReducer, startTypedDraft, tierMessage, type ReviewAction, type ReviewDraft } from "./reviewDraft";

const startedAt = new Date("2026-10-18T12:00:00.000Z");
const confirmedAt = new Date("2026-10-18T12:05:00.000Z");

const apply = (draft: ReviewDraft, ...actions: ReviewAction[]) => actions.reduce(reviewDraftReducer, draft);
const confirmBoth: ReviewAction[] = [
  { type: "setStatement", statement: "extractedValuesMatch", checked: true, at: confirmedAt },
  { type: "setStatement", statement: "isLatestAnalytics", checked: true, at: confirmedAt },
];

describe("typed analytics", () => {
  it("starts with no LR types, five empty passage boxes, and the manual_entry source", () => {
    const { review } = startTypedDraft(startedAt);

    expect(review.extraction).toEqual({ source: "manual_entry", extractedAt: startedAt.toISOString() });
    expect(reviewedRows(review)).toEqual(["Law", "Comparative", "Science", "Humanities", "Art"].map((type) => ({ type, category: "passage" })));
    expect(confirmLock(review)?.reason).toBe("Add a Logical Reasoning type to confirm.");
  });

  it("saves typed percentages and a Highest tier as the snapshot rows", () => {
    const draft = apply(
      startTypedDraft(startedAt),
      { type: "addType", rowType: "Diagram" },
      { type: "editAccuracy", rowType: "Diagram", text: "64" },
      { type: "addType", rowType: "Phenomenon-hypothesis (LR)" },
      { type: "setTier", rowType: "Phenomenon-hypothesis (LR)", tier: "highest" },
      { type: "addType", rowType: "Causal reasoning" },
      { type: "setTier", rowType: "Causal reasoning", tier: "low" },
      { type: "editAccuracy", rowType: "Law", text: "58" },
      ...confirmBoth,
    );

    expect(confirmLock(draft.review)).toBeNull();
    expect(snapshotApproval(draft.review)).toEqual({
      extraction: { source: "manual_entry", extractedAt: startedAt.toISOString() },
      confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: confirmedAt.toISOString() },
    });
    expect(reviewedRows(draft.review)).toEqual(expect.arrayContaining([
      { type: "Diagram", category: "regular", accuracy: 64 },
      { type: "Phenomenon-hypothesis (LR)", category: "restricted", priorityTier: "highest", isTopPriority: true },
      { type: "Causal reasoning", category: "restricted", priorityTier: "low", isTopPriority: false },
      { type: "Law", category: "passage", accuracy: 58 },
    ]));
  });

  it("locks confirm on a tier left unpicked and shows the fix on that row", () => {
    const draft = apply(
      startTypedDraft(startedAt),
      { type: "addType", rowType: "Diagram" },
      { type: "editAccuracy", rowType: "Diagram", text: "64" },
      { type: "addType", rowType: "Causal reasoning" },
      ...confirmBoth,
    );

    expect(confirmLock(draft.review)).toEqual({ reason: "Fix Causal reasoning above to confirm.", fix: { at: "tier", type: "Causal reasoning" } });
    expect(tierMessage(draft, "Causal reasoning")).toBeNull();
    expect(tierMessage(apply(draft, { type: "confirmBlocked" }), "Causal reasoning")).toBe("Pick the tier 7Sage shows, or remove this row.");
  });

  it("shows the typed-entry message for an added type left empty", () => {
    const draft = apply(
      startTypedDraft(startedAt),
      { type: "addType", rowType: "Sufficient assumption" },
      { type: "leaveRow", rowType: "Sufficient assumption" },
    );

    expect(accuracyMessage(draft, "Sufficient assumption")).toBe("Type the percentage, or remove this row.");
  });

  it("counts a High tier as top priority, like Highest", () => {
    const draft = apply(
      startTypedDraft(startedAt),
      { type: "addType", rowType: "Sampling" },
      { type: "setTier", rowType: "Sampling", tier: "high" },
      ...confirmBoth,
    );

    expect(confirmLock(draft.review)).toBeNull();
    expect(reviewedRows(draft.review)).toContainEqual(
      { type: "Sampling", category: "restricted", priorityTier: "high", isTopPriority: true });
  });

  it("needs a percentage or a Highest or High tier, like the server", () => {
    const draft = apply(
      startTypedDraft(startedAt),
      { type: "addType", rowType: "Link assumption" },
      { type: "setTier", rowType: "Link assumption", tier: "medium" },
    );

    expect(confirmLock(draft.review)?.reason).toBe("Add a percentage or a Highest or High tier to confirm.");
  });
});
