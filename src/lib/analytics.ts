import type { AnalyticsExtractedRow, LRLogicType, RCType } from "@/lib/types";

export interface AnalyticsSummary {
  lrAccuracyByType: Record<string, number>;
  lrTopPriorityLogicTypes: LRLogicType[];
  rcAccuracyByType: Partial<Record<RCType, number>>;
}

export function summarizeAnalyticsRows(rows: AnalyticsExtractedRow[]): AnalyticsSummary {
  const lrAccuracyByType: Record<string, number> = {};
  const lrTopPriorityLogicTypes: LRLogicType[] = [];
  const rcAccuracyByType: Partial<Record<RCType, number>> = {};

  for (const row of rows) {
    if (row.category === "regular" && row.accuracy !== undefined) {
      lrAccuracyByType[row.type] = row.accuracy / 100;
    }
    if (row.category === "restricted" && row.isTopPriority) {
      lrTopPriorityLogicTypes.push(row.type as LRLogicType);
    }
    if (row.category === "passage" && row.accuracy !== undefined) {
      rcAccuracyByType[row.type] = row.accuracy / 100;
    }
  }

  return { lrAccuracyByType, lrTopPriorityLogicTypes, rcAccuracyByType };
}
