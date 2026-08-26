import type { AnalyticsExtractedRow, LRLogicType } from "@/lib/types";

export interface AnalyticsSummary {
  lrAccuracyByType: Record<string, number>;
  lrTopPriorityLogicTypes: LRLogicType[];
}

// Converts reviewed OCR rows into the shape AnalyticsSnapshot stores:
// "regular" rows contribute an accuracy reading, "restricted" rows flagged
// top priority contribute to the priority list instead.
export function summarizeAnalyticsRows(rows: AnalyticsExtractedRow[]): AnalyticsSummary {
  const lrAccuracyByType: Record<string, number> = {};
  const lrTopPriorityLogicTypes: LRLogicType[] = [];

  for (const row of rows) {
    if (row.category === "regular" && row.accuracy !== undefined) {
      lrAccuracyByType[row.type] = row.accuracy / 100;
    }
    if (row.category === "restricted" && row.isTopPriority) {
      lrTopPriorityLogicTypes.push(row.type as LRLogicType);
    }
  }

  return { lrAccuracyByType, lrTopPriorityLogicTypes };
}
