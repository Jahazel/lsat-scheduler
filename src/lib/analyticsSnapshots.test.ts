import { describe, expect, it } from "vitest";
import { prepareApprovedSnapshot, SnapshotApprovalError, summarizeApprovedRows, type SnapshotSource } from "./analyticsSnapshots";

const NOW = new Date("2026-10-12T16:00:00.000Z");
const minutesBefore = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const rcAccuracyByType = { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 };

function confirmed(source: SnapshotSource = "7sage_screenshot") {
  return {
    lrAccuracyByType: { Strengthen: 0.7 },
    lrTopPriorityLogicTypes: [],
    rcAccuracyByType,
    extraction: { source, extractedAt: minutesBefore(5) },
    confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: minutesBefore(1) },
  };
}
type Body = ReturnType<typeof confirmed>;
const RC_ERROR = "Enter each RC accuracy from 0 to 100.";
const LR_ERROR = "Enter each LR accuracy from 0 to 100.";
const UNKNOWN_LR_ERROR = "Pick each LR type from the 7Sage list.";
const TOP_PRIORITY_ERROR = "Only Stimulus Logic types can be top priority.";
const DUPLICATE_ERROR = "Enter each type only once.";

describe("prepareApprovedSnapshot", () => {
  it("saves the reviewed values for the approval date, or the simulated date when one is given", () => {
    expect(prepareApprovedSnapshot(confirmed(), NOW)).toMatchObject({
      status: "approved", weekOf: "2026-10-12", lrAccuracyByType: { Strengthen: 0.7 }, rcAccuracyByType, approvedAt: NOW,
    });
    expect(prepareApprovedSnapshot(confirmed(), NOW, NOW, { weekOf: "2027-03-08" }).weekOf).toBe("2027-03-08");
  });

  it.each([
    ["no RC passage types", {}],
    ["some RC passage types", { Law: 0.58, Art: 0 }],
  ])("saves only the RC values given, with %s", (_name, rc) => {
    expect(prepareApprovedSnapshot({ ...confirmed(), rcAccuracyByType: rc }, NOW).rcAccuracyByType).toEqual(rc);
  });

  it.each([
    ["unconfirmed", (body: Body) => ({ ...body, confirmation: { ...body.confirmation, isLatestAnalytics: false } }), "Confirm that the reviewed extraction matches your latest analytics."],
    ["empty", (body: Body) => ({ ...body, lrAccuracyByType: {}, lrTopPriorityLogicTypes: [] }), "The reviewed extraction is empty."],
    ["missing RC accuracy", (body: Body) => ({ ...body, rcAccuracyByType: undefined }), RC_ERROR],
    ["an RC accuracy over 100%", (body: Body) => ({ ...body, rcAccuracyByType: { ...rcAccuracyByType, Law: 1.2 } }), RC_ERROR],
    ["a negative RC accuracy", (body: Body) => ({ ...body, rcAccuracyByType: { Law: -0.1 } }), RC_ERROR],
    ["an unknown passage type", (body: Body) => ({ ...body, rcAccuracyByType: { ...rcAccuracyByType, Poetry: 0.5 } }), RC_ERROR],
    ["stale", (body: Body) => ({ ...body, extraction: { ...body.extraction, extractedAt: minutesBefore(24 * 60 + 1) } }), "Upload a fresh analytics screenshot before saving."],
    ["future extraction", (body: Body) => ({ ...body, extraction: { ...body.extraction, extractedAt: minutesBefore(-1) } }), "Upload a fresh analytics screenshot before saving."],
    ["confirmation before review", (body: Body) => ({ ...body, confirmation: { ...body.confirmation, confirmedAt: minutesBefore(10) } }), "Confirm the extraction after reviewing it."],
  ])("rejects %s", (_name, change, message) => {
    expect(() => prepareApprovedSnapshot(change(confirmed()), NOW)).toThrow(new SnapshotApprovalError(message));
  });

  it("accepts a sample only when the caller allows it, and asks for a new one after 24 hours", () => {
    expect(() => prepareApprovedSnapshot(confirmed("admin_sample"), NOW)).toThrow("Admin access required for sample analytics.");
    expect(prepareApprovedSnapshot(confirmed("admin_sample"), NOW, NOW, { allowAdminSample: true }).extraction.source).toBe("admin_sample");
    const stale = { ...confirmed("admin_sample"), extraction: { source: "admin_sample", extractedAt: minutesBefore(24 * 60 + 1) } };
    expect(() => prepareApprovedSnapshot(stale, NOW, NOW, { allowAdminSample: true }))
      .toThrow("Generate a new sample analytics snapshot before saving.");
  });

  it.each([["admin_sample", true], ["7sage_screenshot", false]] as const)(
    "with a browser clock behind extraction, accepts a %s: %s",
    (source, accepted) => {
      const body = { ...confirmed(source), confirmation: { ...confirmed().confirmation, confirmedAt: minutesBefore(10) } };
      const prepare = () => prepareApprovedSnapshot(body, NOW, NOW, { allowAdminSample: true });
      if (accepted) expect(prepare).not.toThrow();
      else expect(prepare).toThrow("Confirm the extraction after reviewing it.");
    },
  );

  it.each(["7sage_screenshot", "admin_sample", "manual_entry"] as const)("for a %s snapshot, refuses each value check", (source) => {
    const body = confirmed(source);
    const refuses = (values: object, message: string) =>
      expect(() => prepareApprovedSnapshot({ ...body, ...values }, NOW, NOW, { allowAdminSample: true })).toThrow(new SnapshotApprovalError(message));
    refuses({ lrAccuracyByType: { Strengthen: 0.7, Strengthn: 0.5 } }, UNKNOWN_LR_ERROR);
    refuses({ lrTopPriorityLogicTypes: ["Phenomenon-hypothesis"] }, TOP_PRIORITY_ERROR);
    refuses({ lrAccuracyByType: { Strengthen: 1.01 } }, LR_ERROR);
    refuses({ lrAccuracyByType: { Strengthen: -0.01 } }, LR_ERROR);
    refuses({ lrTopPriorityLogicTypes: ["Strengthen"] }, TOP_PRIORITY_ERROR);
    refuses({ lrTopPriorityLogicTypes: ["Causal reasoning", "Causal reasoning"] }, DUPLICATE_ERROR);
    refuses({ rcAccuracyByType: { Law: 1.5 } }, RC_ERROR);
    refuses({ rcAccuracyByType: { Law: -0.1 } }, RC_ERROR);
    refuses({ rcAccuracyByType: { Poetry: 0.5 } }, RC_ERROR);
    refuses({ confirmation: { ...body.confirmation, isLatestAnalytics: false } }, "Confirm that the reviewed extraction matches your latest analytics.");
    expect(prepareApprovedSnapshot({ ...body, lrTopPriorityLogicTypes: ["Causal reasoning", "Diagram"] }, NOW, NOW, { allowAdminSample: true }).extraction.source).toBe(source);
  });

  it("saves a manual entry from a student, and applies the 24-hour freshness rule to screenshots and samples only", () => {
    const old = (source: SnapshotSource) => ({ ...confirmed(source), extraction: { source, extractedAt: minutesBefore(3 * 24 * 60) } });
    expect(prepareApprovedSnapshot(old("manual_entry"), NOW)).toMatchObject({ extraction: { source: "manual_entry" }, lrAccuracyByType: { Strengthen: 0.7 } });
    expect(() => prepareApprovedSnapshot(old("7sage_screenshot"), NOW)).toThrow("Upload a fresh analytics screenshot before saving.");
    expect(() => prepareApprovedSnapshot(old("admin_sample"), NOW, NOW, { allowAdminSample: true })).toThrow("Generate a new sample analytics snapshot before saving.");
    const unconfirmed = { ...confirmed("manual_entry"), confirmation: { ...confirmed().confirmation, isLatestAnalytics: false } };
    expect(() => prepareApprovedSnapshot(unconfirmed, NOW)).toThrow("Confirm that the reviewed extraction matches your latest analytics.");
  });
});

describe("summarizeApprovedRows", () => {
  const rows = [
    { type: "Strengthen", category: "regular", accuracy: 70 },
    { type: "Causal reasoning", category: "restricted", isTopPriority: true },
    { type: "Law", category: "passage", accuracy: 58 },
  ];

  it("turns reviewed rows into snapshot values", () => {
    expect(summarizeApprovedRows(rows)).toEqual({
      lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: ["Causal reasoning"], rcAccuracyByType: { Law: 0.58 },
    });
  });

  it.each([
    ["two LR rows for one type", [...rows, { type: "Strengthen", category: "regular", accuracy: 40 }]],
    ["two RC rows for one passage type", [...rows, { type: "Law", category: "passage", accuracy: 40 }]],
    ["two rows for one Stimulus Logic type", [...rows, { type: "Causal reasoning", category: "restricted" }]],
  ])("refuses %s", (_name, input) => {
    expect(() => summarizeApprovedRows(input)).toThrow(new SnapshotApprovalError(DUPLICATE_ERROR));
  });

  it.each([
    ["an unknown type with no value", { type: "Strengthn", category: "restricted", isTopPriority: false }, UNKNOWN_LR_ERROR],
    ["a Question Stem type sent as a priority flag", { type: "Weaken", category: "restricted", isTopPriority: true }, TOP_PRIORITY_ERROR],
    ["an RC row with an LR type", { type: "Weaken", category: "passage", accuracy: 50 }, RC_ERROR],
    ["a flag row with an accuracy over 100", { type: "Quantifier", category: "restricted", accuracy: 150, isTopPriority: true }, LR_ERROR],
    ["an LR accuracy over 100", { type: "Weaken", category: "regular", accuracy: 101 }, LR_ERROR],
    ["a negative RC accuracy", { type: "Art", category: "passage", accuracy: -1 }, RC_ERROR],
  ])("refuses %s, even when the summary would drop it", (_name, row, message) => {
    expect(() => summarizeApprovedRows([...rows, row])).toThrow(new SnapshotApprovalError(message));
  });

  it("refuses a row whose accuracy is not a number", () => {
    expect(() => summarizeApprovedRows([{ type: "Strengthen", category: "regular", accuracy: "70" }]))
      .toThrow("Confirm that the reviewed extraction matches your latest analytics.");
  });
});
