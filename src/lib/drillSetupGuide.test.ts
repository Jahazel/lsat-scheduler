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

  it("gives five titled steps that name the section, with the same opening steps for every drill", () => {
    const { steps, texts } = guide(lr(["Inference"], 5, "L2-4"));
    expect(steps.map((step) => step.title)).toEqual(
      ["Open Drills on 7Sage", "Start a new drill", "Choose Customize", "Filter and add questions", "Check the count and save"]);
    expect(texts.slice(0, 3)).toEqual([
      "Open 7Sage. Go to Study, then Practice, then Drills.",
      "Under Logical Reasoning, click New drill.",
      "Skip the adaptive drill. Click Customize.",
    ]);
    expect(guide(rc({ type: "Law", difficultyLevel: 3 })).texts[1]).toBe("Under Reading Comprehension, click New drill.");
  });

  it("filters a one-type LR drill once, by its type and difficulty range, for its question count", () => {
    const content = guide(lr(["Inference"], 5, "L2-4"));
    expect(content.section).toBe("Logical Reasoning");
    expect(content.passes).toEqual([{ tags: "Inference", difficulty: { low: 2, high: 4 }, add: 5, unit: "questions" }]);
    expect(content.total).toBe("5 questions");
    expect(content.texts[3]).toBe("Set Tags to Inference and Difficulty to 2 to 4. Click Add on 5 questions.");
    expect(content.texts[4]).toBe("Check that it says 5 questions selected. Click Save & share, then start the drill.");
    expect(values(content.steps[3]!.text)).toEqual(["Inference", "2 to 4", "Add", "5"]);
    expect(content.guess).toEqual({ tags: false, difficulty: true });
  });

  it("filters a paired LR drill twice, in the order of its types, adding half the questions each time", () => {
    const content = guide(lr(["Strengthen", "Weaken"], 10, "L3-5"));
    expect(content.passes.map(({ tags, add }) => [tags, add])).toEqual([["Strengthen", 5], ["Weaken", 5]]);
    expect(content.total).toBe("10 questions");
    expect(content.texts[3]).toBe("Set Tags to Strengthen and Difficulty to 3 to 5. Click Add on 5 questions. "
      + "Then set Tags to Weaken and Difficulty to 3 to 5, and add 5 more.");
    expect(content.texts[4]).toBe("Check that it says 10 questions selected. Click Save & share, then start the drill.");
  });

  it("gives the first type of a paired drill the extra question of an odd count", () => {
    expect(guide(lr(["Strengthen", "Weaken"], 7, "L2-4")).passes.map((pass) => pass.add)).toEqual([4, 3]);
  });

  it("reads a range with equal ends as one number", () => {
    expect(guide(lr(["Inference"], 5, "L3-3")).texts[3]).toBe("Set Tags to Inference and Difficulty to 3. Click Add on 5 questions.");
  });

  it("filters a one-passage RC drill by passage type and level, adding one passage", () => {
    const content = guide(rc({ type: "Science", difficultyLevel: 3 }));
    expect(content.section).toBe("Reading Comprehension");
    expect(content.passes).toEqual([{ tags: "Science", difficulty: { low: 3, high: 3 }, add: 1, unit: "passage" }]);
    expect(content.total).toBe("1 passage");
    expect(content.texts[3]).toBe("Set Tags to Science and Difficulty to 3. Click Add on 1 passage.");
    expect(content.texts[4]).toBe("Check that it says 1 passage selected. Click Save & share, then start the drill.");
    expect(content.guess).toEqual({ tags: true, difficulty: true });
  });

  it("filters a two-passage RC drill once per passage, easier passage first like the drill label", () => {
    const content = guide(rc({ type: "Law", difficultyLevel: 4 }, { type: "Humanities", difficultyLevel: 2 }));
    expect(content.passes.map(({ tags, difficulty }) => [tags, difficulty.low])).toEqual([["Humanities", 2], ["Law", 4]]);
    expect(content.total).toBe("2 passages");
    expect(content.texts[3]).toBe("Set Tags to Humanities and Difficulty to 2. Click Add on 1 passage. "
      + "Then set Tags to Law and Difficulty to 4, and add 1 more.");
    expect(content.texts[4]).toBe("Check that it says 2 passages selected. Click Save & share, then start the drill.");
  });

  it("keeps two same-level passages in the drill's order", () => {
    expect(guide(rc({ type: "Science", difficultyLevel: 3 }, { type: "Law", difficultyLevel: 3 })).passes.map((pass) => pass.tags))
      .toEqual(["Science", "Law"]);
  });

  it("names the longest real types in full", () => {
    const content = guide(lr(["Parallel flawed method of reasoning", "Parallel method of reasoning"], 10, "L3-5"));
    expect(content.texts[3]).toBe("Set Tags to Parallel flawed method of reasoning and Difficulty to 3 to 5. Click Add on 5 questions. "
      + "Then set Tags to Parallel method of reasoning and Difficulty to 3 to 5, and add 5 more.");
    expect(guide(lr(["PSA - find or complete the application"], 5, "L3-5")).passes[0].tags).toBe("PSA - find or complete the application");
  });

  it("has no guide for a difficulty range it cannot read", () => {
    expect(drillSetupGuide(lr(["Inference"], 5, "hard"))).toBeNull();
  });
});
