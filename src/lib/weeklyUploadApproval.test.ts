import { describe, expect, it } from "vitest";
import { PT158_FIXTURES } from "./practiceTestFixtures/pt158";
import { prepareWeeklyUploadApproval } from "./weeklyUploadApproval";

const now = new Date("2026-10-17T17:05:00.000Z");
const extractedAt = "2026-10-17T17:00:00.000Z";
const confirmedAt = "2026-10-17T17:04:00.000Z";

const analytics = {
  lrAccuracyByType: { "Necessary assumption": 0.76 },
  lrTopPriorityLogicTypes: ["Phenomenon-hypothesis (LR)"],
  rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
  extraction: { source: "7sage_screenshot", extractedAt },
  confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt },
};

const practiceTest = () => ({
  readings: PT158_FIXTURES.map(({ reading }) => structuredClone(reading)),
  picks: [],
  extraction: { source: "7sage_screenshot", extractedAt },
  confirmation: { extractedValuesMatch: true, isThisWeeksPracticeTest: true, confirmedAt },
});

const options = { allowAdminSample: false, needsPracticeTest: true };
const prepare = (input: object, overrides: Partial<typeof options> = {}) =>
  prepareWeeklyUploadApproval({ currentScore: 156, analytics, practiceTest: practiceTest(), ...input }, now, now, { ...options, ...overrides });

describe("weekly upload approval", () => {
  it("prepares the snapshot, the practice-test result, and the score together", () => {
    const prepared = prepare({});

    expect(prepared.currentScore).toBe(156);
    expect(prepared.snapshot.lrAccuracyByType).toEqual({ "Necessary assumption": 0.76 });
    expect(prepared.practiceTest).toMatchObject({
      prepTest: 158,
      weekOf: prepared.snapshot.weekOf,
      approvedAt: now,
      missedStemTypeCounts: { "Flaw or descriptive weakening": 2 },
      hiddenResults: [{ section: 3, question: 18, result: "correct", settledBy: "score" }],
    });
  });

  it("refuses missed counts sent by the browser, since it works them out from the section readings", () => {
    expect(() => prepare({ practiceTest: { ...practiceTest(), missedStemTypeCounts: { Weaken: 9 } } }))
      .toThrow("Confirm that the practice-test values match your screenshots.");
  });

  it.each([
    ["a score above 180", { currentScore: 181 }, "Enter a score from 120 to 180."],
    ["a score below 120", { currentScore: 119 }, "Enter a score from 120 to 180."],
    ["a score that is not whole", { currentScore: 155.5 }, "Enter a score from 120 to 180."],
    ["a score sent as text", { currentScore: "156" }, "Enter a score from 120 to 180."],
    ["no practice test in a practice-test week", { practiceTest: null }, "Add this week's practice test before you confirm."],
    ["an unticked practice-test statement",
      { practiceTest: { ...practiceTest(), confirmation: { extractedValuesMatch: true, isThisWeeksPracticeTest: false, confirmedAt } } },
      "Confirm that the practice-test values match your screenshots."],
    ["only three sections", { practiceTest: { ...practiceTest(), readings: practiceTest().readings.slice(0, 3) } },
      "Confirm that the practice-test values match your screenshots."],
    ["a missed count that does not match its section score",
      { practiceTest: { ...practiceTest(), readings: practiceTest().readings.map((reading) => ({ ...reading, score: -1 })) } },
      "Fix your practice-test screenshots before you confirm."],
    ["a sample practice test from a student", { practiceTest: { ...practiceTest(), extraction: { source: "admin_sample", extractedAt } } },
      "Admin access required for sample analytics."],
    ["a stale practice-test reading",
      { practiceTest: { ...practiceTest(), extraction: { source: "7sage_screenshot", extractedAt: "2026-10-15T17:00:00.000Z" } } },
      "Upload fresh practice-test screenshots before saving."],
  ])("refuses %s", (_case, input, message) => {
    expect(() => prepare(input)).toThrow(message);
  });

  it("refuses a practice test in a week whose plan had none, and accepts analytics alone", () => {
    expect(() => prepare({}, { needsPracticeTest: false })).toThrow("This week's plan had no practice test.");
    expect(prepare({ practiceTest: null }, { needsPracticeTest: false }).practiceTest).toBeNull();
  });

  it("accepts an admin's sample practice test", () => {
    const sample = { ...practiceTest(), extraction: { source: "admin_sample", extractedAt } };
    const prepared = prepare({ practiceTest: sample, analytics: { ...analytics, extraction: { source: "admin_sample", extractedAt } } },
      { allowAdminSample: true });

    expect(prepared.practiceTest?.extractionSource).toBe("admin_sample");
    expect(prepared.snapshot.extraction.source).toBe("admin_sample");
  });
});
