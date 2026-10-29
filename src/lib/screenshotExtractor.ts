import { createHash } from "node:crypto";
import { categoryFor, extractAnalyticsRowsFromImage, ModelReplyRefused, readPracticeTestSectionFromImage, type AnalyticsExtraction, type RecordCost } from "./claudeExtract";
import { PT158_FIXTURES } from "./practiceTestFixtures/pt158";
import type { SectionReading } from "./practiceTestResult";
import type { ScreenshotMediaType } from "./screenshotUpload";
import type { AnalyticsExtractedRow, AnalyticsSection, LRExtractedRow, PassageExtractedRow, RulesConfig } from "./types";

const FAKE_ROWS: Omit<LRExtractedRow, "category">[] = [
  { type: "Strengthen", accuracy: 68 },
  { type: "Necessary assumption", accuracy: 74 },
  { type: "Causal reasoning", isTopPriority: true, priorityTier: "highest" },
  { type: "Link assumption", isTopPriority: false, priorityTier: "medium" },
  { type: "Conditional reasoning", accuracy: 81 },
];

const FAKE_PASSAGE_ROWS: PassageExtractedRow[] = [
  { type: "Law", category: "passage", accuracy: 58 },
  { type: "Comparative", category: "passage", accuracy: 70 },
  { type: "Science", category: "passage", accuracy: 64 },
  { type: "Humanities", category: "passage", accuracy: 81 },
  { type: "Art", category: "passage", accuracy: 77 },
];

function fakeLRRows(rules: RulesConfig): AnalyticsExtractedRow[] {
  return FAKE_ROWS.map((row) => ({ ...row, category: categoryFor(row.type, rules) }));
}

export async function extractAnalyticsRows(
  imageBuffer: Buffer,
  mediaType: ScreenshotMediaType,
  rules: RulesConfig,
  section: AnalyticsSection,
  recordCost: RecordCost,
): Promise<AnalyticsExtraction> {
  const setting = process.env.SCREENSHOT_EXTRACTOR;
  switch (setting) {
    case undefined:
    case "":
      return extractAnalyticsRowsFromImage(imageBuffer, mediaType, rules, section, recordCost);
    case "fake":
      if (section === "RC") return { rows: FAKE_PASSAGE_ROWS, showsPassageTypes: true };
      return { rows: fakeLRRows(rules) };
    case "fake-wrong-page":
      if (section === "RC") return { rows: [], showsPassageTypes: false };
      return { rows: fakeLRRows(rules) };
    case "fake-no-percentages":
      if (section === "RC") return { rows: [], showsPassageTypes: true };
      return { rows: fakeLRRows(rules) };
    case "fake-failure":
      throw new ModelReplyRefused("Fake screenshot extractor failed on request");
    default:
      throw new Error(`Unknown SCREENSHOT_EXTRACTOR value: ${setting}`);
  }
}

export async function extractPracticeTestSection(
  imageBuffer: Buffer,
  mediaType: ScreenshotMediaType,
  recordCost: RecordCost,
): Promise<SectionReading> {
  const setting = process.env.SCREENSHOT_EXTRACTOR;
  switch (setting) {
    case undefined:
    case "":
      return readPracticeTestSectionFromImage(imageBuffer, mediaType, recordCost);
    case "fake": {
      const sha256 = createHash("sha256").update(imageBuffer).digest("hex");
      return PT158_FIXTURES.find((fixture) => fixture.sha256 === sha256)?.reading ?? { page: "other" };
    }
    case "fake-failure":
      throw new ModelReplyRefused("Fake screenshot extractor failed on request");
    default:
      throw new Error(`Unknown SCREENSHOT_EXTRACTOR value: ${setting}`);
  }
}
