import { dateInScheduleTimezone, type StudentClock } from "./adminTestWorkspace";
import { z } from "zod";
import { summarizeAnalyticsRows } from "./analytics";
import { mockRules } from "./mockData";
import type { AnalyticsExtractedRow, LRLogicType, RCType } from "@/lib/types";

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

const SNAPSHOT_SOURCES = ["7sage_screenshot", "admin_sample", "manual_entry"] as const;
export type SnapshotSource = (typeof SNAPSHOT_SOURCES)[number];

const KNOWN_LR_TYPES = new Set<string>([...mockRules.lrStemTypes, ...mockRules.lrLogicTypes]);
const LOGIC_TYPES = new Set<string>(mockRules.lrLogicTypes);

const SnapshotApprovalSchema = z.object({
  lrAccuracyByType: z.record(z.string(), z.unknown()),
  lrTopPriorityLogicTypes: z.array(z.string()),
  rcAccuracyByType: z.unknown(),
  extraction: z.object({
    source: z.enum(SNAPSHOT_SOURCES),
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
    source: SnapshotSource;
    extractedAt: string;
  };
  confirmation: {
    extractedValuesMatch: true;
    isLatestAnalytics: true;
    confirmedAt: string;
  };
}

export class SnapshotApprovalError extends Error {}

const DUPLICATE_TYPE = "Enter each type only once.";
const UNKNOWN_LR_TYPE = "Pick each LR type from the 7Sage list.";
const LR_ACCURACY_RANGE = "Enter each LR accuracy from 0 to 100.";
const RC_ACCURACY_RANGE = "Enter each RC accuracy from 0 to 100.";
const TOP_PRIORITY_LOGIC_ONLY = "Only Stimulus Logic types can be top priority.";

function categoryOf(type: string) {
  if ((mockRules.rcTypes as string[]).includes(type)) return "passage";
  if (!KNOWN_LR_TYPES.has(type)) return null;
  return LOGIC_TYPES.has(type) && !(mockRules.lrLogicExceptions as string[]).includes(type) ? "restricted" : "regular";
}

const ReviewedRowsSchema = z.array(z.looseObject({
  type: z.string(),
  category: z.enum(["regular", "restricted", "passage"]),
  accuracy: z.number().optional(),
  isTopPriority: z.boolean().optional(),
}));

export function summarizeApprovedRows(rows: unknown) {
  const parsed = ReviewedRowsSchema.safeParse(rows);
  if (!parsed.success) {
    throw new SnapshotApprovalError("Confirm that the reviewed extraction matches your latest analytics.");
  }
  for (const row of parsed.data) {
    const passage = row.category === "passage";
    const category = categoryOf(row.type);
    if (category !== row.category) {
      if (passage) throw new SnapshotApprovalError(RC_ACCURACY_RANGE);
      throw new SnapshotApprovalError(row.category === "restricted" && category === "regular" ? TOP_PRIORITY_LOGIC_ONLY : UNKNOWN_LR_TYPE);
    }
    if (row.accuracy !== undefined && !(row.accuracy >= 0 && row.accuracy <= 100)) {
      throw new SnapshotApprovalError(passage ? RC_ACCURACY_RANGE : LR_ACCURACY_RANGE);
    }
  }
  if (new Set(parsed.data.map((row) => row.type)).size !== parsed.data.length) {
    throw new SnapshotApprovalError(DUPLICATE_TYPE);
  }
  return summarizeAnalyticsRows(parsed.data as AnalyticsExtractedRow[]);
}

export class SnapshotSaveLimitReached extends SnapshotApprovalError {
  constructor() {
    super("You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time.");
  }
}

export function checkApprovalTimes(
  { extraction, confirmation }: {
    extraction: { source: SnapshotSource; extractedAt: string };
    confirmation: { confirmedAt: string };
  },
  realNow: Date,
  messages: { stale: string; early: string },
) {
  const extractedAt = new Date(extraction.extractedAt);
  if (extraction.source !== "manual_entry" && (realNow.getTime() - extractedAt.getTime() > MAX_EXTRACTION_AGE_MS || extractedAt > realNow)) {
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
  const lrTypes = Object.keys(values.lrAccuracyByType);
  if (lrTypes.some((type) => !KNOWN_LR_TYPES.has(type))) {
    throw new SnapshotApprovalError(UNKNOWN_LR_TYPE);
  }
  const lrAccuracy = z.record(z.string(), Accuracy).safeParse(values.lrAccuracyByType);
  if (!lrAccuracy.success) {
    throw new SnapshotApprovalError(LR_ACCURACY_RANGE);
  }
  if (values.lrTopPriorityLogicTypes.some((type) => !LOGIC_TYPES.has(type))) {
    throw new SnapshotApprovalError(TOP_PRIORITY_LOGIC_ONLY);
  }
  if (new Set(values.lrTopPriorityLogicTypes).size !== values.lrTopPriorityLogicTypes.length) {
    throw new SnapshotApprovalError(DUPLICATE_TYPE);
  }
  const rcAccuracy = RCAccuracySchema.safeParse(values.rcAccuracyByType);
  if (!rcAccuracy.success) {
    throw new SnapshotApprovalError(RC_ACCURACY_RANGE);
  }
  if (values.extraction.source === "admin_sample" && !options.allowAdminSample) {
    throw new SnapshotApprovalError("Admin access required for sample analytics.");
  }
  if (
    lrTypes.length === 0 &&
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
    lrAccuracyByType: lrAccuracy.data,
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
