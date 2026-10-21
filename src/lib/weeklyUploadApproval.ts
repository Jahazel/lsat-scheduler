import { z } from "zod";
import { prepareApprovedSnapshot, SnapshotApprovalError } from "./analyticsSnapshots";
import { reviewPracticeTest, type SectionReview } from "./practiceTestResult";
import { MAX_SCORE, MIN_SCORE } from "./weeklyUpload";

const MAX_EXTRACTION_AGE_MS = 24 * 60 * 60 * 1000;

const SectionHeader = {
  page: z.literal("section_review"),
  prepTest: z.number().int().positive(),
  section: z.number().int().min(1).max(4),
  score: z.number().int().max(0),
  reachesEnd: z.boolean(),
};

const SectionReviewSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...SectionHeader, kind: z.literal("RC") }),
  z.strictObject({
    ...SectionHeader,
    kind: z.literal("LR"),
    rows: z.array(z.strictObject({
      question: z.number().int().positive(),
      result: z.enum(["correct", "wrong", "unanswered", "hidden"]),
      tags: z.array(z.string().max(40)).max(12),
    })).max(30),
  }),
]) satisfies z.ZodType<SectionReview>;

const PracticeTestApprovalSchema = z.strictObject({
  readings: z.array(SectionReviewSchema).length(4),
  picks: z.array(z.strictObject({ section: z.number().int(), missed: z.array(z.number().int()) })).max(4),
  extraction: z.strictObject({
    source: z.enum(["7sage_screenshot", "admin_sample"]),
    extractedAt: z.iso.datetime(),
  }),
  confirmation: z.strictObject({
    extractedValuesMatch: z.literal(true),
    isThisWeeksPracticeTest: z.literal(true),
    confirmedAt: z.iso.datetime(),
  }),
});

const WeeklyUploadApprovalSchema = z.object({
  currentScore: z.unknown(),
  analytics: z.unknown(),
  practiceTest: z.unknown(),
});

const ScoreSchema = z.number().int().min(MIN_SCORE).max(MAX_SCORE);

export type PracticeTestApprovalInput = z.input<typeof PracticeTestApprovalSchema>;

export interface WeeklyUploadApprovalOptions {
  allowAdminSample: boolean;
  weekOf?: string;
  /** Whether the current weekly schedule held a practice test, so the upload must include one. */
  needsPracticeTest: boolean;
}

function preparePracticeTest(input: unknown, approvedAt: Date, realNow: Date, weekOf: string, allowAdminSample: boolean) {
  const parsed = PracticeTestApprovalSchema.safeParse(input);
  if (!parsed.success) throw new SnapshotApprovalError("Confirm that the practice-test values match your screenshots.");
  const { readings, picks, extraction, confirmation } = parsed.data;
  if (extraction.source === "admin_sample" && !allowAdminSample) {
    throw new SnapshotApprovalError("Admin access required for sample analytics.");
  }
  const extractedAt = new Date(extraction.extractedAt);
  const confirmedAt = new Date(confirmation.confirmedAt);
  if (realNow.getTime() - extractedAt.getTime() > MAX_EXTRACTION_AGE_MS || extractedAt > realNow) {
    throw new SnapshotApprovalError("Upload fresh practice-test screenshots before saving.");
  }
  if ((extraction.source !== "admin_sample" && confirmedAt < extractedAt) || confirmedAt > realNow) {
    throw new SnapshotApprovalError("Confirm the practice test after reviewing it.");
  }
  // The browser's counts are not trusted: the result is worked out again from the section readings.
  const review = reviewPracticeTest(readings, picks);
  if (!review.ok) throw new SnapshotApprovalError("Fix your practice-test screenshots before you confirm.");
  const { prepTest, sections, hiddenResults, missedStemTypeCounts } = review.result;
  return {
    weekOf,
    prepTest,
    sections,
    hiddenResults,
    missedStemTypeCounts,
    approvedAt,
    extractionSource: extraction.source,
    extractedAt,
    extractedValuesMatch: true as const,
    isThisWeeksPracticeTest: true as const,
    confirmedAt,
  };
}

export type PreparedWeeklyUpload = ReturnType<typeof prepareWeeklyUploadApproval>;

export function prepareWeeklyUploadApproval(input: unknown, approvedAt: Date, realNow: Date, options: WeeklyUploadApprovalOptions) {
  const parsed = WeeklyUploadApprovalSchema.safeParse(input);
  if (!parsed.success) throw new SnapshotApprovalError("Confirm that the reviewed values match your screenshots.");
  const score = ScoreSchema.safeParse(parsed.data.currentScore);
  if (!score.success) throw new SnapshotApprovalError(`Enter a score from ${MIN_SCORE} to ${MAX_SCORE}.`);
  const snapshot = prepareApprovedSnapshot(parsed.data.analytics, approvedAt, realNow, {
    allowAdminSample: options.allowAdminSample,
    weekOf: options.weekOf,
  });
  const { practiceTest } = parsed.data;
  if (options.needsPracticeTest && practiceTest == null) {
    throw new SnapshotApprovalError("Add this week's practice test before you confirm.");
  }
  if (!options.needsPracticeTest && practiceTest != null) {
    throw new SnapshotApprovalError("This week's plan had no practice test. Confirm your analytics only.");
  }
  return {
    snapshot,
    practiceTest: practiceTest == null
      ? null
      : preparePracticeTest(practiceTest, approvedAt, realNow, snapshot.weekOf, options.allowAdminSample),
    currentScore: score.data,
  };
}
