import { categoryFor, extractAnalyticsRowsFromImage } from "./claudeExtract";
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

export async function extractAnalyticsRows(
  imageBuffer: Buffer,
  mediaType: ScreenshotMediaType,
  rules: RulesConfig,
  section: AnalyticsSection,
): Promise<AnalyticsExtractedRow[]> {
  const setting = process.env.SCREENSHOT_EXTRACTOR;
  switch (setting) {
    case undefined:
    case "":
      return extractAnalyticsRowsFromImage(imageBuffer, mediaType, rules, section);
    case "fake":
      if (section === "RC") return FAKE_PASSAGE_ROWS;
      return FAKE_ROWS.map((row) => ({ ...row, category: categoryFor(row.type, rules) }));
    case "fake-failure":
      throw new Error("Fake screenshot extractor failed on request");
    default:
      throw new Error(`Unknown SCREENSHOT_EXTRACTOR value: ${setting}`);
  }
}
