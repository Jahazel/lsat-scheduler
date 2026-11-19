import { describe, expect, it } from "vitest";
import { uploadHistory } from "./uploadHistory";

const snapshot = (id: string, weekOf: string, lr: Record<string, number>, rc?: Record<string, number>, score: number | null = null) =>
  ({ id, weekOf, approvedAt: `${weekOf}T12:00:00.000Z`, lrAccuracyByType: lr, ...(rc && { rcAccuracyByType: rc }), score });

describe("uploadHistory", () => {
  it("lists uploads by month, newest first, tagging the newest and the first", () => {
    const months = uploadHistory([
      snapshot("c", "2026-11-02", { Weaken: 0.5 }),
      snapshot("a", "2026-10-19", { Weaken: 0.4 }),
      snapshot("b", "2026-10-26", { Weaken: 0.45 }),
    ], []);
    expect(months.map(({ month, uploads }) => [month, uploads.map((upload) => `${upload.label} ${upload.tag}`)])).toEqual([
      ["November 2026", ["Nov 2 – 8 Newest"]],
      ["October 2026", ["Oct 26 – Nov 1 null", "Oct 19 – 25 First upload"]],
    ]);
  });

  it("sorts LR weakest first with the change since the upload before, and names the two that moved most", () => {
    const [{ uploads: [newest] }] = uploadHistory([
      snapshot("old", "2026-10-26", { Weaken: 0.5, Evaluate: 0.6, Inference: 0.7 }),
      snapshot("new", "2026-11-02", { Weaken: 0.62, Evaluate: 0.58, Inference: 0.7, Flaw: 0.4 }, { Law: 0.6 }),
    ], [])!;
    expect(newest!.lr.map((row) => [row.type, row.accuracy, row.change && Math.round(row.change * 100)])).toEqual([
      ["Flaw", 0.4, null], ["Evaluate", 0.58, -2], ["Weaken", 0.62, 12], ["Inference", 0.7, 0],
    ]);
    expect(newest!.movedMost.map((row) => row.type)).toEqual(["Weaken", "Evaluate"]);
    expect(newest!.rc).toEqual([{ type: "Law", accuracy: 0.6 }]);
  });

  it("gives each upload its score and the change since the last earlier upload with a score", () => {
    const [{ uploads }] = uploadHistory([
      snapshot("before-scores", "2026-11-02", { Weaken: 0.5 }),
      snapshot("first-score", "2026-11-09", { Weaken: 0.5 }, undefined, 155),
      snapshot("no-score", "2026-11-16", { Weaken: 0.5 }),
      snapshot("newest", "2026-11-23", { Weaken: 0.5 }, undefined, 159),
    ], [])!;
    expect(uploads.map((row) => [row.id, row.score, row.scoreChange])).toEqual([
      ["newest", 159, 4], ["no-score", null, null], ["first-score", 155, null], ["before-scores", null, null],
    ]);
  });

  it("shows the practice test confirmed with the same upload, most missed types first", () => {
    const [{ uploads }] = uploadHistory([snapshot("a", "2026-11-02", { Weaken: 0.5 }), snapshot("b", "2026-10-26", { Weaken: 0.5 })], [
      { weekOf: "2026-11-02", prepTest: 141, missed: 13, missedStemTypeCounts: { Weaken: 2, "Flaw or descriptive weakening": 4 } },
    ])!;
    expect(uploads[0]!.practiceTest).toEqual({ prepTest: 141, missed: 13, missedTypes: [["Flaw or descriptive weakening", 4], ["Weaken", 2]] });
  });

  it("has no months without uploads", () => {
    expect(uploadHistory([], [])).toEqual([]);
  });
});
