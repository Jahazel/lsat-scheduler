import { z } from "zod";
import type { LRLogicType } from "@/lib/types";

const MAX_EXTRACTION_AGE_MS = 24 * 60 * 60 * 1000;

const SnapshotApprovalSchema = z.object({
  lrAccuracyByType: z.record(z.string(), z.number().finite().min(0).max(1)),
  lrTopPriorityLogicTypes: z.array(z.string()),
  extraction: z.object({
    source: z.literal("7sage_screenshot"),
    extractedAt: z.string().datetime(),
  }),
  confirmation: z.object({
    extractedValuesMatch: z.literal(true),
    isLatestAnalytics: z.literal(true),
    confirmedAt: z.string().datetime(),
  }),
});

export interface SnapshotApprovalMetadata {
  extraction: {
    source: "7sage_screenshot";
    extractedAt: string;
  };
  confirmation: {
    extractedValuesMatch: true;
    isLatestAnalytics: true;
    confirmedAt: string;
  };
}

export class SnapshotApprovalError extends Error {}

export function prepareApprovedSnapshot(input: unknown, approvedAt = new Date()) {
  const parsed = SnapshotApprovalSchema.safeParse(input);
  if (!parsed.success) {
    throw new SnapshotApprovalError("Confirm that the reviewed extraction matches your latest analytics.");
  }

  const values = parsed.data;
  if (
    Object.keys(values.lrAccuracyByType).length === 0 &&
    values.lrTopPriorityLogicTypes.length === 0
  ) {
    throw new SnapshotApprovalError("The reviewed extraction is empty.");
  }

  const extractedAt = new Date(values.extraction.extractedAt);
  if (approvedAt.getTime() - extractedAt.getTime() > MAX_EXTRACTION_AGE_MS || extractedAt > approvedAt) {
    throw new SnapshotApprovalError("Upload a fresh analytics screenshot before saving.");
  }

  const confirmedAt = new Date(values.confirmation.confirmedAt);
  if (confirmedAt < extractedAt || confirmedAt > approvedAt) {
    throw new SnapshotApprovalError("Confirm the extraction after reviewing it.");
  }

  return {
    weekOf: approvedAt.toISOString().slice(0, 10),
    lrAccuracyByType: values.lrAccuracyByType,
    lrTopPriorityLogicTypes: values.lrTopPriorityLogicTypes as LRLogicType[],
    status: "approved" as const,
    approvedAt,
    extraction: { source: values.extraction.source, extractedAt },
    confirmation: {
      extractedValuesMatch: true as const,
      isLatestAnalytics: true as const,
      confirmedAt,
    },
  };
}
