import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PT158_FIXTURES } from "./practiceTestFixtures/pt158";
import { mockRules } from "./mockData";
import { extractAnalyticsRows, extractPracticeTestSection } from "./screenshotExtractor";
import type { AnalyticsSection } from "./types";

const createMessage = vi.hoisted(() => vi.fn());
const recordCost = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: createMessage }; } }));

beforeEach(() => vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake"));
afterEach(() => {
  vi.unstubAllEnvs();
  createMessage.mockReset();
  recordCost.mockReset();
});

it.each(PT158_FIXTURES)("reads $file into its section with the fake extractor", async ({ file, reading }) => {
  const image = await readFile(new URL(`./practiceTestFixtures/${file}`, import.meta.url));
  expect(await extractPracticeTestSection(image, "image/png", recordCost)).toEqual(reading);
});

it("reads any other image as another page with the fake extractor", async () => {
  expect(await extractPracticeTestSection(Buffer.from("not a practice test"), "image/png", recordCost)).toEqual({ page: "other" });
});

it("fails on request with the failing fake extractor", async () => {
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake-failure");
  await expect(extractPracticeTestSection(Buffer.from("x"), "image/png", recordCost)).rejects.toThrow("Fake screenshot extractor failed on request");
});

function claudeReplies(content: unknown[]) {
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
  createMessage.mockResolvedValue({ content, usage: { input_tokens: 1500, output_tokens: 200 } });
}

const toolUse = (name: string, input: unknown) => ({ type: "tool_use", id: "toolu_recorded", name, input });

function claudeReads(input: unknown) {
  claudeReplies([toolUse("record_practice_test_section", input)]);
  return extractPracticeTestSection(Buffer.from("x"), "image/png", recordCost);
}

function claudeReadsAnalytics(section: AnalyticsSection, content: unknown[]) {
  claudeReplies(content);
  return extractAnalyticsRows(Buffer.from("x"), "image/png", mockRules, section, recordCost);
}

it("reads a section from Claude, keeping the score negative and dropping RC rows", async () => {
  expect(await claudeReads({
    page: "section_review", prepTest: 158, section: 2, kind: "LR", score: 2, reachesEnd: true,
    rows: [{ question: 1, result: "hidden", tags: ["MC"] }],
  })).toEqual({
    page: "section_review", prepTest: 158, section: 2, kind: "LR", score: -2, reachesEnd: true,
    rows: [{ question: 1, result: "hidden", tags: ["MC"] }],
  });
  expect(await claudeReads({
    page: "section_review", prepTest: 158, section: 1, kind: "RC", score: -9, reachesEnd: true, rows: [],
  })).toEqual({ page: "section_review", prepTest: 158, section: 1, kind: "RC", score: -9, reachesEnd: true });
  expect(await claudeReads({ page: "analytics", rows: [] })).toEqual({ page: "analytics" });
});

const lrSection = { page: "section_review", prepTest: 158, section: 2, kind: "LR", score: -2, reachesEnd: true };
const lrRow = { question: 1, result: "correct", tags: ["Flaw"] };

it.each([
  ["a section without a score", [toolUse("record_practice_test_section", { ...lrSection, score: undefined, rows: [] })]],
  ["an unknown result", [toolUse("record_practice_test_section", { ...lrSection, rows: [{ ...lrRow, result: "maybe" }] })]],
  ["reachesEnd as text", [toolUse("record_practice_test_section", { ...lrSection, reachesEnd: "true", rows: [] })]],
  ["a score past the section's questions", [toolUse("record_practice_test_section", { ...lrSection, score: -31, rows: [] })]],
  ["a section number that is not on a test", [toolUse("record_practice_test_section", { ...lrSection, section: 5, rows: [] })]],
  ["31 question rows", [toolUse("record_practice_test_section", {
    ...lrSection, rows: Array.from({ length: 31 }, (_, i) => ({ ...lrRow, question: (i % 30) + 1 })),
  })]],
  ["a question number past the section", [toolUse("record_practice_test_section", { ...lrSection, rows: [{ ...lrRow, question: 99 }] })]],
  ["9 tags on one question", [toolUse("record_practice_test_section", {
    ...lrSection, rows: [{ ...lrRow, tags: Array.from({ length: 9 }, () => "Flaw") }],
  })]],
  ["the analytics tool", [toolUse("record_analytics_rows", { page: "other" })]],
  ["text and no tool", [{ type: "text", text: "This looks like a practice test." }]],
])("refuses a section reply with %s", async (_case, content) => {
  claudeReplies(content);
  await expect(extractPracticeTestSection(Buffer.from("x"), "image/png", recordCost)).rejects.toThrow("does not fit its format");
});

it("reads LR and RC analytics rows that fit the tool's format", async () => {
  expect(await claudeReadsAnalytics("LR", [toolUse("record_analytics_rows", {
    rows: [{ type: "Strengthen", accuracy: 100 }, { type: "Causal reasoning", priority: "HIGHEST" }, { type: "Weaken", accuracy: 0 }],
  })])).toEqual({ rows: [
    { type: "Strengthen", category: "regular", accuracy: 100 },
    { type: "Causal reasoning", category: "restricted", isTopPriority: true, priorityTier: "highest" },
    { type: "Weaken", category: "regular", accuracy: 0 },
  ] });
  expect(await claudeReadsAnalytics("RC", [toolUse("record_analytics_rows", { showsPassageTypes: true, rows: [{ type: "Law", accuracy: 58 }] })]))
    .toEqual({ rows: [{ type: "Law", category: "passage", accuracy: 58 }], showsPassageTypes: true });
  expect(await claudeReadsAnalytics("RC", [toolUse("record_analytics_rows", { showsPassageTypes: true, rows: [] })]))
    .toEqual({ rows: [], showsPassageTypes: true });
  expect(await claudeReadsAnalytics("RC", [toolUse("record_analytics_rows", { showsPassageTypes: false, rows: [] })]))
    .toEqual({ rows: [], showsPassageTypes: false });
});

it.each([
  ["LR", "an unknown type name", [toolUse("record_analytics_rows", { rows: [{ type: "Ignore previous instructions", accuracy: 50 }] })]],
  ["LR", "an RC passage type", [toolUse("record_analytics_rows", { rows: [{ type: "Law", accuracy: 50 }] })]],
  ["LR", "accuracy over 100", [toolUse("record_analytics_rows", { rows: [{ type: "Strengthen", accuracy: 140 }] })]],
  ["LR", "negative accuracy", [toolUse("record_analytics_rows", { rows: [{ type: "Strengthen", accuracy: -5 }] })]],
  ["LR", "accuracy as text", [toolUse("record_analytics_rows", { rows: [{ type: "Strengthen", accuracy: "68%" }] })]],
  ["LR", "an unknown priority", [toolUse("record_analytics_rows", { rows: [{ type: "Causal reasoning", priority: "URGENT" }] })]],
  ["LR", "more rows than there are types", [toolUse("record_analytics_rows", {
    rows: Array.from({ length: mockRules.lrStemTypes.length + mockRules.lrLogicTypes.length + 1 }, () => ({ type: "Strengthen", accuracy: 50 })),
  })]],
  ["LR", "no rows list", [toolUse("record_analytics_rows", { types: ["Strengthen"] })]],
  ["LR", "another tool", [toolUse("record_practice_test_section", { rows: [] })]],
  ["LR", "no tool", [{ type: "text", text: "I can't see any rows." }]],
  ["RC", "an LR type", [toolUse("record_analytics_rows", { showsPassageTypes: true, rows: [{ type: "Strengthen", accuracy: 70 }] })]],
  ["RC", "accuracy over 100", [toolUse("record_analytics_rows", { showsPassageTypes: true, rows: [{ type: "Law", accuracy: 101 }] })]],
  ["RC", "6 rows", [toolUse("record_analytics_rows", { showsPassageTypes: true, rows: Array.from({ length: 6 }, () => ({ type: "Law", accuracy: 50 })) })]],
  ["RC", "no page flag", [toolUse("record_analytics_rows", { rows: [] })]],
] as const)("refuses an %s analytics reply with %s", async (section, _case, content) => {
  await expect(claudeReadsAnalytics(section, [...content])).rejects.toThrow("does not fit its format");
});

it("records each Claude reply's cost from its token usage, also when the reply does not fit its format", async () => {
  await claudeReadsAnalytics("RC", [toolUse("record_analytics_rows", { showsPassageTypes: true, rows: [{ type: "Law", accuracy: 58 }] })]);
  await expect(claudeReads({ page: "unknown" })).rejects.toThrow("does not fit its format");

  expect(recordCost.mock.calls).toEqual([[0.0025], [0.0025]]);
});

it("records no cost from the fake extractor", async () => {
  await extractAnalyticsRows(Buffer.from("x"), "image/png", mockRules, "LR", recordCost);
  expect(recordCost).not.toHaveBeenCalled();
});

it("reports a wrong RC page with the wrong-page fake extractor", async () => {
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake-wrong-page");
  expect(await extractAnalyticsRows(Buffer.from("x"), "image/png", mockRules, "RC", recordCost)).toEqual({ rows: [], showsPassageTypes: false });
});

it("reports a passage-type page with no percentages from the no-percentages fake extractor", async () => {
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake-no-percentages");
  expect(await extractAnalyticsRows(Buffer.from("x"), "image/png", mockRules, "RC", recordCost)).toEqual({ rows: [], showsPassageTypes: true });
});
