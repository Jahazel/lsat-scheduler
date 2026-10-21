import { describe, expect, it } from "vitest";
import { PT158_FIXTURES } from "./practiceTestFixtures/pt158";
import { reviewPracticeTest, type LRRow, type SectionReading } from "./practiceTestResult";

const readings = () => PT158_FIXTURES.map(({ reading }) => structuredClone(reading));

function result(files: SectionReading[], picks?: Parameters<typeof reviewPracticeTest>[1]) {
  const review = reviewPracticeTest(files, picks);
  if (!review.ok) throw new Error(`Expected a result, got ${JSON.stringify(review.problems)}`);
  return review.result;
}

function problems(files: SectionReading[], picks?: Parameters<typeof reviewPracticeTest>[1]) {
  const review = reviewPracticeTest(files, picks);
  if (review.ok) throw new Error("Expected problems, got a result");
  return review.problems;
}

function lrRows(file: SectionReading): LRRow[] {
  if (file.page !== "section_review" || file.kind !== "LR") throw new Error("Not an LR reading");
  return file.rows;
}

describe("practice-test result", () => {
  it("finds 8 missed LR questions in PrepTest 158, with Flaw or descriptive weakening first at 2", () => {
    const found = result(readings());
    expect(found.prepTest).toBe(158);
    expect(found.missedQuestions).toBe(8);
    expect(found.missedStemTypes).toHaveLength(7);
    expect(found.missedStemTypes[0]).toEqual({
      type: "Flaw or descriptive weakening",
      misses: [{ section: 2, question: 18, result: "wrong" }, { section: 4, question: 18, result: "wrong" }],
    });
    expect(found.missedStemTypes.find(({ type }) => type === "Inference")?.misses)
      .toEqual([{ section: 3, question: 23, result: "unanswered" }]);
    expect(found.missedStemTypeCounts).toEqual({
      "Flaw or descriptive weakening": 2,
      "Parallel method of reasoning": 1,
      "Main conclusion or main point": 1,
      Inference: 1,
      Weaken: 1,
      "PSA - find or complete the application": 1,
      "Resolve reconcile or explain": 1,
    });
    expect(found.sections.map(({ section, kind, score, missed }) => ({ section, kind, score, missed }))).toEqual([
      { section: 1, kind: "RC", score: -9, missed: 9 },
      { section: 2, kind: "LR", score: -2, missed: 2 },
      { section: 3, kind: "LR", score: -4, missed: 4 },
      { section: 4, kind: "LR", score: -2, missed: 2 },
    ]);
    expect(found.hiddenResults).toEqual([]);
  });

  it("settles a hidden S3 Q18 as right when the -4 score already has its 4 misses", () => {
    const files = readings();
    lrRows(files[2])[17].result = "hidden";
    const found = result(files);
    expect(found.hiddenResults).toEqual([{ section: 3, question: 18, result: "correct", settledBy: "score" }]);
    expect(found.missedQuestions).toBe(8);
  });

  it("counts hidden rows as missed when the score needs all of them", () => {
    const files = readings();
    lrRows(files[1])[17].result = "hidden";
    const found = result(files);
    expect(found.hiddenResults).toEqual([{ section: 2, question: 18, result: "missed", settledBy: "score" }]);
    expect(found.missedStemTypes[0].misses).toEqual([
      { section: 2, question: 18, result: "hidden" }, { section: 4, question: 18, result: "wrong" },
    ]);
  });

  it("asks the student to pick when the score cannot settle the hidden rows", () => {
    const files = readings();
    const rows = lrRows(files[2]);
    rows[17].result = "hidden";
    rows[18].result = "hidden";
    files[2] = { ...files[2], score: -5 } as SectionReading;
    expect(problems(files)).toEqual([{
      problem: "hidden-pick", file: 2, section: 3, pick: 1,
      candidates: [{ question: 18, stemTypes: ["Argument part"] }, { question: 19, stemTypes: ["Sufficient assumption"] }],
    }]);

    const found = result(files, [{ section: 3, missed: [19] }]);
    expect(found.hiddenResults).toEqual([
      { section: 3, question: 18, result: "correct", settledBy: "student" },
      { section: 3, question: 19, result: "missed", settledBy: "student" },
    ]);
    expect(found.missedStemTypeCounts["Sufficient assumption"]).toBe(1);
    expect(found.missedQuestions).toBe(9);
  });

  it.each([
    ["too many questions", [18, 19]],
    ["a question that is not hidden", [3]],
    ["no question", []],
  ])("keeps asking when the pick has %s", (_case, missed) => {
    const files = readings();
    const rows = lrRows(files[2]);
    rows[17].result = "hidden";
    rows[18].result = "hidden";
    files[2] = { ...files[2], score: -5 } as SectionReading;
    expect(problems(files, [{ section: 3, missed }])).toMatchObject([{ problem: "hidden-pick", section: 3 }]);
  });

  it("names what a wrong page shows", () => {
    const files = readings();
    files[1] = { page: "analytics" };
    files[3] = { page: "other" };
    expect(problems(files)).toEqual([
      { problem: "wrong-page", file: 1, shows: "analytics" },
      { problem: "wrong-page", file: 3, shows: "other" },
      { problem: "section-missing", section: 2 },
      { problem: "section-missing", section: 4 },
    ]);
  });

  it("flags the later copy of a section and names the section still missing", () => {
    const files = readings();
    files[2] = structuredClone(files[1]);
    expect(problems(files)).toEqual([
      { problem: "same-section-twice", file: 2, section: 2, missingSection: 3 },
      { problem: "section-missing", section: 3 },
    ]);
  });

  it("flags a missing section", () => {
    expect(problems(readings().slice(0, 3))).toEqual([{ problem: "section-missing", section: 4 }]);
  });

  it("flags a section from another PrepTest", () => {
    const files = readings();
    files[3] = { ...files[3], prepTest: 157 } as SectionReading;
    expect(problems(files)).toEqual([{ problem: "different-prep-test", file: 3, prepTest: 157, expected: 158 }]);
  });

  it.each([
    ["stops at Q20", (rows: LRRow[]) => rows.slice(0, 20), true, 20],
    ["is missing its last question", (rows: LRRow[]) => rows, false, 26],
    ["skips a question", (rows: LRRow[]) => rows.filter(({ question }) => question !== 7), true, 26],
  ])("flags a section that %s as cut off", (_case, cut, reachesEnd, lastQuestion) => {
    const files = readings();
    files[3] = { ...files[3], rows: cut(lrRows(files[3])), reachesEnd } as SectionReading;
    expect(problems(files)).toEqual([{ problem: "cut-off", file: 3, section: 4, lastQuestion }]);
  });

  it("flags a cut-off RC section", () => {
    const files = readings();
    files[0] = { ...files[0], reachesEnd: false } as SectionReading;
    expect(problems(files)).toEqual([{ problem: "cut-off", file: 0, section: 1, lastQuestion: null }]);
  });

  it("treats a section outside 1 to 4 as a wrong page", () => {
    const files = [...readings(), { ...readings()[1], section: 5 } as SectionReading];
    expect(problems(files)).toEqual([{ problem: "wrong-page", file: 4, shows: "other" }]);
  });

  it("flags a section whose missed count does not match its score", () => {
    const files = readings();
    lrRows(files[1])[0].result = "wrong";
    expect(problems(files)).toEqual([{ problem: "score-mismatch", file: 1, section: 2, score: -2, missed: 3 }]);
  });

  it("flags a score that more hidden rows than exist would need", () => {
    const files = readings();
    lrRows(files[2])[17].result = "hidden";
    files[2] = { ...files[2], score: -6 } as SectionReading;
    expect(problems(files)).toEqual([{ problem: "score-mismatch", file: 2, section: 3, score: -6, missed: 4 }]);
  });

  it("ignores logic and unknown tags, and never counts RC misses", () => {
    const files = readings();
    const rows = lrRows(files[1]);
    rows[17].tags = ["CausR", "Flaw", "Flaw", "Mystery"];
    rows[24].tags = ["CondR", "Diag", "LinkA"];
    const found = result(files);
    expect(found.missedQuestions).toBe(8);
    expect(found.missedStemTypeCounts["Flaw or descriptive weakening"]).toBe(2);
    expect(found.missedStemTypeCounts["Parallel method of reasoning"]).toBeUndefined();
    expect(Object.keys(found.missedStemTypeCounts)).toHaveLength(6);
  });
});
