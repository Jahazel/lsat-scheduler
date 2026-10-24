import { dateInScheduleTimezone, type StudentClock } from "./adminTestWorkspace";
import { z } from "zod";
import type { LRLogicType, RCType } from "@/lib/types";

const MAX_EXTRACTION_AGE_MS = 24 * 60 * 60 * 1000;

const Accuracy = z.number().finite().min(0).max(1);
const OptionalAccuracy = Accuracy.optional();
const RCAccuracySchema = z.strictObject({
  Law: OptionalAccuracy,
  Comparative: OptionalAccuracy,
  Science: OptionalAccuracy,
  Humanities: OptionalAccuracy,
  Art: OptionalAccuracy,
} satisfies Record<RCType, typeof OptionalAccuracy>);

const SnapshotApprovalSchema = z.object({
  lrAccuracyByType: z.record(z.string(), Accuracy),
  lrTopPriorityLogicTypes: z.array(z.string()),
  rcAccuracyByType: z.unknown(),
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

export function checkApprovalTimes(
  { extraction, confirmation }: {
    extraction: { source: "7sage_screenshot" | "admin_sample"; extractedAt: string };
    confirmation: { confirmedAt: string };
  },
  realNow: Date,
  messages: { stale: string; early: string },
) {
  const extractedAt = new Date(extraction.extractedAt);
  if (realNow.getTime() - extractedAt.getTime() > MAX_EXTRACTION_AGE_MS || extractedAt > realNow) {
    throw new SnapshotApprovalError(messages.stale);
  }
  const confirmedAt = new Date(confirmation.confirmedAt);
  // Samples are generated on the server and confirmed on the browser's clock.
  // Screenshot extraction and confirmation both use the browser's clock.
  if ((extraction.source !== "admin_sample" && confirmedAt < extractedAt) || confirmedAt > realNow) {
    throw new SnapshotApprovalError(messages.early);
  }
  return { extractedAt, confirmedAt };
}

export function snapshotWeekOptions(clock: StudentClock) {
  return clock.simulated ? { weekOf: dateInScheduleTimezone(clock.now) } : {};
}

export function prepareApprovedSnapshot(input: unknown, approvedAt = new Date(), realNow = approvedAt, options: { allowAdminSample?: boolean; weekOf?: string } = {}) {
  const parsed = SnapshotApprovalSchema.safeParse(input);
  if (!parsed.success) {
    throw new SnapshotApprovalError("Confirm that the reviewed extraction matches your latest analytics.");
  }

  const values = parsed.data;
  const rcAccuracy = RCAccuracySchema.safeParse(values.rcAccuracyByType);
  if (!rcAccuracy.success) {
    throw new SnapshotApprovalError("Enter each RC accuracy from 0 to 100.");
  }
  if (values.extraction.source === "admin_sample" && !options.allowAdminSample) {
    throw new SnapshotApprovalError("Admin access required for sample analytics.");
  }
  if (
    Object.keys(values.lrAccuracyByType).length === 0 &&
    values.lrTopPriorityLogicTypes.length === 0
  ) {
    throw new SnapshotApprovalError("The reviewed extraction is empty.");
  }

  const { extractedAt, confirmedAt } = checkApprovalTimes(values, realNow, {
    stale: values.extraction.source === "admin_sample"
      ? "Generate a new sample analytics snapshot before saving."
      : "Upload a fresh analytics screenshot before saving.",
    early: "Confirm the extraction after reviewing it.",
  });

  return {
    weekOf: options.weekOf ?? approvedAt.toISOString().slice(0, 10),
    lrAccuracyByType: values.lrAccuracyByType,
    lrTopPriorityLogicTypes: values.lrTopPriorityLogicTypes as LRLogicType[],
    rcAccuracyByType: rcAccuracy.data,
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
