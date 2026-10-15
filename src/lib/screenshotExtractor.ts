import { categoryFor, extractAnalyticsRowsFromImage } from "./claudeExtract";
import type { AnalyticsExtractedRow, RulesConfig } from "./types";

const FAKE_ROWS: Omit<AnalyticsExtractedRow, "category">[] = [
  { type: "Strengthen", accuracy: 68 },
  { type: "Necessary assumption", accuracy: 74 },
  { type: "Causal reasoning", isTopPriority: true },
  { type: "Conditional reasoning", accuracy: 81 },
];

export async function extractAnalyticsRows(
  imageBuffer: Buffer,
  mediaType: string,
  rules: RulesConfig
): Promise<AnalyticsExtractedRow[]> {
  const setting = process.env.SCREENSHOT_EXTRACTOR;
  switch (setting) {
    case undefined:
    case "":
      return extractAnalyticsRowsFromImage(imageBuffer, mediaType, rules);
    case "fake":
      return FAKE_ROWS.map((row) => ({ ...row, category: categoryFor(row.type, rules) }));
    case "fake-failure":
      throw new Error("Fake screenshot extractor failed on request");
    default:
      throw new Error(`Unknown SCREENSHOT_EXTRACTOR value: ${setting}`);
  }
}
