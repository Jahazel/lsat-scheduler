import { describe, expect, it } from "vitest";
import { drillSetupGuide, type StepText } from "./drillSetupGuide";
import type { Activity, LRDrill, RCDrill } from "./types";

const words = (text: StepText) => text.map((part) => typeof part === "string" ? part : part.value).join("");
const values = (text: StepText) => text.flatMap((part) => typeof part === "string" ? [] : [part.value]);
const lr = (types: LRDrill["types"], questionCount: number, difficultyRange: string): LRDrill =>
  ({ kind: "LR", isFullSection: false, types, questionCount, difficultyRange, drillMinutes: 15 });
const rc = (...passages: RCDrill["passages"]): RCDrill => ({ kind: "RC", isFullSection: false, passages, drillMinutes: 9 });

function guide(activity: Activity) {
  const content = drillSetupGuide(activity);
  if (!content) throw new Error("expected a drill setup guide");
  return { ...content, texts: content.steps.map((step) => words(step.text)) };
}

describe("drill setup guide", () => {
  it.each<[string, Activity]>([
    ["a full LR section", { kind: "LR", isFullSection: true, drillMinutes: 35 }],
    ["a full RC section", { kind: "RC", isFullSection: true, drillMinutes: 35 }],
    ["a practice test", { kind: "PT", label: "Practice Test (from PT 130+)", minutes: 188 }],
    ["a review", { kind: "REVIEW", label: "PT Review + Blind Review", minutes: 180 }],
  ])("has no guide for %s", (_, activity) => {
    expect(drillSetupGuide(activity)).toBeNull();
  });

  it("gives four titled steps that follow the tutor's 7Sage path and name the section", () => {
    const { steps, texts } = guide(lr(["Inference"], 5, "L2-4"));
    expect(steps.map((step) => step.title)).toEqual(
      ["Start a drill on 7Sage", "Customize the questions", "Set the filters", "Set the count and start"]);
    expect(texts.slice(0, 2)).toEqual([
      "Open 7Sage. Go to Study, then Drills and sections. Under Logical Reasoning, click Start drill.",
      "Click Customize questions.",
    ]);
    expect(guide(rc({ type: "Law", difficultyLevel: 3 })).texts[0])
      .toBe("Open 7Sage. Go to Study, then Drills and sections. Under Reading Comprehension, click Start drill.");
  });

  it("builds a one-type LR drill as one 7Sage drill, picking every level in its difficulty range", () => {
    const content = guide(lr(["Inference"], 5, "L2-4"));
    expect(content.section).toBe("Logical Reasoning");
    expect(content.drills).toEqual([{ tags: "Inference", difficulty: { low: 2, high: 4 }, count: 5, unit: "questions" }]);
    expect(content.total).toBe("5 questions");
    expect(content.texts[2]).toBe("Set Tags to Inference and Question Difficulty to 2, 3 and 4.");
    expect(content.texts[3]).toBe("Set Number of questions to 5. Pick any Timing, then click Start Drill.");
    expect(values(content.steps[2]!.text)).toEqual(["Inference", "2, 3 and 4"]);
  });

  it("builds a paired LR drill as two 7Sage drills, in the order of its types, half the questions each", () => {
    const content = guide(lr(["Strengthen", "Weaken"], 10, "L3-4"));
    expect(content.drills.map(({ tags, count }) => [tags, count])).toEqual([["Strengthen", 5], ["Weaken", 5]]);
    expect(content.total).toBe("10 questions");
    expect(content.texts[2]).toBe("You build this as two drills on 7Sage. For the first, set Tags to Strengthen and Question Difficulty to 3 and 4.");
    expect(content.texts[3]).toBe("Set Number of questions to 5. Pick any Timing, then click Start Drill. "
      + "When it ends, repeat steps 1 to 4 with Tags set to Weaken and Question Difficulty set to 3 and 4, and Number of questions set to 5.");
  });

  it("gives the first type of a paired drill the extra question of an odd count", () => {
    expect(guide(lr(["Strengthen", "Weaken"], 7, "L2-4")).drills.map((drill) => drill.count)).toEqual([4, 3]);
  });

  it("reads a range with equal ends as one level", () => {
    expect(guide(lr(["Inference"], 5, "L3-3")).texts[2]).toBe("Set Tags to Inference and Question Difficulty to 3.");
  });

  it("builds a one-passage RC drill by passage type and level, with one passage", () => {
    const content = guide(rc({ type: "Science", difficultyLevel: 3 }));
    expect(content.section).toBe("Reading Comprehension");
    expect(content.drills).toEqual([{ tags: "Science", difficulty: { low: 3, high: 3 }, count: 1, unit: "passages" }]);
    expect(content.total).toBe("1 passage");
    expect(content.texts[2]).toBe("Set Tags to Science (under RC passage subject) and Passage Difficulty to 3.");
    expect(content.texts[3]).toBe("Set Number of passages to 1. Pick any Timing, then click Start Drill.");
  });

  it("builds a two-passage RC drill as two 7Sage drills, easier passage first like the drill label", () => {
    const content = guide(rc({ type: "Law", difficultyLevel: 4 }, { type: "Humanities", difficultyLevel: 2 }));
    expect(content.drills.map(({ tags, difficulty }) => [tags, difficulty.low])).toEqual([["Humanities", 2], ["Law", 4]]);
    expect(content.total).toBe("2 passages");
    expect(content.texts[2]).toBe("You build this as two drills on 7Sage. For the first, set Tags to Humanities (under RC passage subject) and Passage Difficulty to 2.");
    expect(content.texts[3]).toBe("Set Number of passages to 1. Pick any Timing, then click Start Drill. "
      + "When it ends, repeat steps 1 to 4 with Tags set to Law (under RC passage subject) and Passage Difficulty set to 4, and Number of passages set to 1.");
  });

  it("keeps two same-level passages in the drill's order", () => {
    expect(guide(rc({ type: "Science", difficultyLevel: 3 }, { type: "Law", difficultyLevel: 3 })).drills.map((drill) => drill.tags))
      .toEqual(["Science", "Law"]);
  });

  it("names the longest real types in full", () => {
    const content = guide(lr(["Parallel flawed method of reasoning", "Parallel method of reasoning"], 10, "L3-5"));
    expect(content.texts[2]).toBe("You build this as two drills on 7Sage. "
      + "For the first, set Tags to Parallel flawed method of reasoning and Question Difficulty to 3, 4 and 5.");
    expect(content.texts[3]).toBe("Set Number of questions to 5. Pick any Timing, then click Start Drill. When it ends, repeat steps 1 to 4 "
      + "with Tags set to Parallel method of reasoning and Question Difficulty set to 3, 4 and 5, and Number of questions set to 5.");
    expect(guide(lr(["PSA - find or complete the application"], 5, "L3-5")).drills[0].tags).toBe("PSA - find or complete the application");
  });

  it("has no guide for a difficulty range it cannot read", () => {
    expect(drillSetupGuide(lr(["Inference"], 5, "hard"))).toBeNull();
  });
});
