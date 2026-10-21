import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PT158_FIXTURES } from "./practiceTestFixtures/pt158";
import { extractPracticeTestSection } from "./screenshotExtractor";

const createMessage = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: createMessage }; } }));

beforeEach(() => vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake"));
afterEach(() => {
  vi.unstubAllEnvs();
  createMessage.mockReset();
});

it.each(PT158_FIXTURES)("reads $file into its section with the fake extractor", async ({ file, reading }) => {
  const image = await readFile(new URL(`./practiceTestFixtures/${file}`, import.meta.url));
  expect(await extractPracticeTestSection(image, "image/png")).toEqual(reading);
});

it("reads any other image as another page with the fake extractor", async () => {
  expect(await extractPracticeTestSection(Buffer.from("not a practice test"), "image/png")).toEqual({ page: "other" });
});

it("fails on request with the failing fake extractor", async () => {
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake-failure");
  await expect(extractPracticeTestSection(Buffer.from("x"), "image/png")).rejects.toThrow("Fake screenshot extractor failed on request");
});

function claudeReads(input: unknown) {
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
  createMessage.mockResolvedValue({ content: [{ type: "tool_use", input }] });
  return extractPracticeTestSection(Buffer.from("x"), "image/png");
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

it.each([
  ["a section without a score", { page: "section_review", prepTest: 158, section: 2, kind: "LR", reachesEnd: true, rows: [] }],
  ["an unknown result", {
    page: "section_review", prepTest: 158, section: 2, kind: "LR", score: -2, reachesEnd: true,
    rows: [{ question: 1, result: "maybe", tags: [] }],
  }],
  ["no tool input", undefined],
])("reads %s from Claude as another page", async (_case, input) => {
  expect(await claudeReads(input)).toEqual({ page: "other" });
});
