import { dateInScheduleTimezone } from "./adminTestWorkspace";
import { z } from "zod";
import type { LRLogicType } from "@/lib/types";

const MAX_EXTRACTION_AGE_MS = 24 * 60 * 60 * 1000;

const SnapshotApprovalSchema = z.object({
  lrAccuracyByType: z.record(z.string(), z.number().finite().min(0).max(1)),
  lrTopPriorityLogicTypes: z.array(z.string()),
  extraction: z.object({
    source: z.enum(["7sage_screenshot", "admin_sample"]),
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
    source: "7sage_screenshot" | "admin_sample";
    extractedAt: string;
  };
  confirmation: {
    extractedValuesMatch: true;
    isLatestAnalytics: true;
    confirmedAt: string;
  };
}

export class SnapshotApprovalError extends Error {}

export function snapshotWeekOptions(approvedAt: Date, realNow: Date) {
  return approvedAt !== realNow ? { weekOf: dateInScheduleTimezone(approvedAt) } : {};
}

export function prepareApprovedSnapshot(input: unknown, approvedAt = new Date(), realNow = approvedAt, options: { allowAdminSample?: boolean; weekOf?: string } = {}) {
  const parsed = SnapshotApprovalSchema.safeParse(input);
  if (!parsed.success) {
    throw new SnapshotApprovalError("Confirm that the reviewed extraction matches your latest analytics.");
  }

  const values = parsed.data;
  if (values.extraction.source === "admin_sample" && !options.allowAdminSample) {
    throw new SnapshotApprovalError("Admin access required for sample analytics.");
  }
  if (
    Object.keys(values.lrAccuracyByType).length === 0 &&
    values.lrTopPriorityLogicTypes.length === 0
  ) {
    throw new SnapshotApprovalError("The reviewed extraction is empty.");
  }

  const extractedAt = new Date(values.extraction.extractedAt);
  if (realNow.getTime() - extractedAt.getTime() > MAX_EXTRACTION_AGE_MS || extractedAt > realNow) {
    throw new SnapshotApprovalError("Upload a fresh analytics screenshot before saving.");
  }

  const confirmedAt = new Date(values.confirmation.confirmedAt);
  // Samples are generated on the server and confirmed on the browser's clock.
  // Screenshot extraction and confirmation both use the browser's clock.
  if ((values.extraction.source !== "admin_sample" && confirmedAt < extractedAt) || confirmedAt > realNow) {
    throw new SnapshotApprovalError("Confirm the extraction after reviewing it.");
  }

  return {
    weekOf: options.weekOf ?? approvedAt.toISOString().slice(0, 10),
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
