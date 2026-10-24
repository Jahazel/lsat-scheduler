import { describe, expect, it } from "vitest";
import { prepareApprovedSnapshot, SnapshotApprovalError } from "./analyticsSnapshots";

const NOW = new Date("2026-10-12T16:00:00.000Z");
const minutesBefore = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const rcAccuracyByType = { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 };

function confirmed(source: "7sage_screenshot" | "admin_sample" = "7sage_screenshot") {
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
});
