import { describe, expect, expectTypeOf, it } from "vitest";
import { activityLabel } from "./activityLabel";
import type { LRDrill, RCDrill } from "./types";

describe("activity labels", () => {
  it.each([
    ["LR", "1 Full LR Section"],
    ["RC", "1 Full RC Section"],
  ] as const)("labels the full %s section without its types", (kind, label) => {
    expect(activityLabel({ kind, isFullSection: true, drillMinutes: 35 })).toBe(label);
  });

  it("labels a one-type LR drill", () => {
    expect(activityLabel({ kind: "LR", isFullSection: false, types: ["Inference"], questionCount: 5,
      difficultyRange: "L2-4", drillMinutes: 7.5 })).toBe("5 Inference (L2-4)");
  });

  it("drops the shared last word from the first of two two-word types", () => {
    expect(activityLabel({ kind: "LR", isFullSection: false, types: ["Necessary assumption", "Sufficient assumption"],
      questionCount: 10, difficultyRange: "L2-4", drillMinutes: 15 }))
      .toBe("10 Necessary + Sufficient assumption (L2-4)");
  });

  it.each([
    [["Flaw or descriptive weakening", "Weaken"], "10 Flaw or descriptive weakening + Weaken (L3-5)"],
    [["Must be true", "Must be false"], "10 Must be true + Must be false (L3-5)"],
    [["Strengthen", "Most strongly supported"], "10 Strengthen + Most strongly supported (L3-5)"],
  ] as const)("keeps both full names when they don't share a two-word ending: %j", (types, label) => {
    expect(activityLabel({ kind: "LR", isFullSection: false, types: [...types], questionCount: 10,
      difficultyRange: "L3-5", drillMinutes: 15 })).toBe(label);
  });

  it("labels a one-passage RC drill with its type and level", () => {
    expect(activityLabel({ kind: "RC", isFullSection: false, passages: [{ type: "Law", difficultyLevel: 3 }],
      drillMinutes: 9 })).toBe("1 RC Passage Law L3");
  });

  it.each([
    [[{ type: "Comparative", difficultyLevel: 4 }, { type: "Art", difficultyLevel: 2 }], "2 RC Passages Art L2, Comparative L4"],
    [[{ type: "Art", difficultyLevel: 2 }, { type: "Comparative", difficultyLevel: 4 }], "2 RC Passages Art L2, Comparative L4"],
    [[{ type: "Law", difficultyLevel: 3 }, { type: "Science", difficultyLevel: 3 }], "2 RC Passages Law L3, Science L3"],
    [[{ type: "Science", difficultyLevel: 3 }, { type: "Law", difficultyLevel: 3 }], "2 RC Passages Science L3, Law L3"],
  ] as const)("labels a two-passage RC drill with each level, easier first: %j", (passages, label) => {
    expect(activityLabel({ kind: "RC", isFullSection: false, drillMinutes: 18, passages: [...passages] })).toBe(label);
  });

  it("allows only one or two LR types and one or two RC passages", () => {
    const passage = { type: "Law" as const, difficultyLevel: 2 };
    expectTypeOf<[]>().not.toExtend<LRDrill["types"]>();
    expectTypeOf<["Inference", "Strengthen", "Weaken"]>().not.toExtend<LRDrill["types"]>();
    expectTypeOf<["Necessary assumption", "Sufficient assumption"]>().toExtend<LRDrill["types"]>();
    expectTypeOf<[]>().not.toExtend<RCDrill["passages"]>();
    expectTypeOf<[typeof passage, typeof passage, typeof passage]>().not.toExtend<RCDrill["passages"]>();
    expectTypeOf<[typeof passage, typeof passage]>().toExtend<RCDrill["passages"]>();
  });
});
