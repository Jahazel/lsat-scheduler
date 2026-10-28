import { z } from "zod";
import type { StudentClock } from "./adminTestWorkspace";
import {
  checkApprovalTimes, prepareApprovedSnapshot, SnapshotApprovalError, snapshotWeekOptions, summarizeApprovedRows,
} from "./analyticsSnapshots";
import {
  approvedForWeek, currentDayInTimezone, currentWeekInTimezone, newestApprovedSnapshots, uploadWeekOf, weeklyUploadIsOpen,
} from "./currentWeeklySchedule";
import { DAY_ORDER } from "./engine";
import { reviewPracticeTest, type SectionReview } from "./practiceTestResult";
import type { ScanningOff } from "./scanSpending";
import { isoDateInWeek } from "./scheduleReasonText";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";
import type { ApprovedAnalyticsSnapshot, PersistedWeeklySchedule, Student } from "./types";
import { MAX_SCORE, MIN_SCORE, type WeeklyUploadBasis } from "./weeklyUploadPreview";

const TREND_WINDOW = 3;
const STALE_PAGE = "This page is out of date. Open This week to continue.";

const scheduleForWeek = (schedules: PersistedWeeklySchedule[], weekStartDate: string) =>
  schedules.find((record) => record.weekStartDate === weekStartDate)?.schedule;

function weekHadPracticeTest(schedules: PersistedWeeklySchedule[], weekStartDate: string) {
  const schedule = scheduleForWeek(schedules, weekStartDate);
  return DAY_ORDER.some((day) => schedule?.days[day].activities.some((activity) => activity.kind === "PT") ?? false);
}

function uploadNeeds(now: Date, schedules: PersistedWeeklySchedule[]) {
  const currentWeek = currentWeekInTimezone(now, SCHEDULE_TIMEZONE);
  if (!weeklyUploadIsOpen(now, SCHEDULE_TIMEZONE, schedules.some((record) => record.weekStartDate === currentWeek))) return null;
  const weekOf = uploadWeekOf(now, SCHEDULE_TIMEZONE);
  const lastWeek = isoDateInWeek(weekOf, -7);
  const plansThisWeek = weekOf === currentWeek;
  return {
    weekOf,
    lastWeek,
    plans: plansThisWeek ? "this_week" as const : "next_week" as const,
    startsOn: plansThisWeek ? currentDayInTimezone(now, SCHEDULE_TIMEZONE) : "MONDAY" as const,
    hadPracticeTest: weekHadPracticeTest(schedules, lastWeek),
  };
}

export function openWeeklyUpload({ clock, student, schedules, snapshots }: {
  clock: StudentClock;
  student: Student;
  schedules: PersistedWeeklySchedule[];
  snapshots: ApprovedAnalyticsSnapshot[];
}): WeeklyUploadBasis | null {
  const needs = uploadNeeds(clock.now, schedules);
  if (!needs) return null;
  const { lastWeek, ...basis } = needs;
  if (basis.plans === "this_week" && approvedForWeek(snapshots, basis.weekOf, SCHEDULE_TIMEZONE).length > 0) return null;
  const sunday = scheduleForWeek(schedules, lastWeek)?.days.SUNDAY;
  return {
    ...basis,
    student,
    priorSnapshots: newestApprovedSnapshots(snapshots)
      .slice(0, TREND_WINDOW - 1)
      .map(({ id, approvedAt, weekOf, lrAccuracyByType, lrTopPriorityLogicTypes, rcAccuracyByType }) =>
        ({ id, approvedAt, weekOf, lrAccuracyByType, lrTopPriorityLogicTypes, ...(rcAccuracyByType && { rcAccuracyByType }) })),
    priorWeekPracticeTestReviewMinutes: sunday?.type === "practice_test"
      ? sunday.activities.find((activity) => activity.kind === "PT")?.minutes
      : undefined,
    priorSchedules: schedules.filter((record) => record.weekStartDate < basis.weekOf).map((record) => record.schedule),
  };
}

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
  analytics: z.object({ rows: z.unknown(), extraction: z.unknown(), confirmation: z.unknown() }),
  practiceTest: z.unknown(),
});

const ScoreSchema = z.number().int().min(MIN_SCORE).max(MAX_SCORE);

export type PracticeTestApprovalInput = z.input<typeof PracticeTestApprovalSchema>;

const TargetWeek = z.object({ weekOf: z.iso.date() });
const Parts = z.object({ analytics: z.unknown(), practiceTest: z.unknown() });
const Sample = z.object({ extraction: z.object({ source: z.literal("admin_sample") }) });

export function usesAdminSample(input: unknown) {
  const parts = Parts.safeParse(input);
  return parts.success && [parts.data.analytics, parts.data.practiceTest].some((part) => Sample.safeParse(part).success);
}

function preparePracticeTest(input: unknown, approvedAt: Date, realNow: Date, weekOf: string, allowAdminSample: boolean) {
  const parsed = PracticeTestApprovalSchema.safeParse(input);
  if (!parsed.success) throw new SnapshotApprovalError("Confirm that the practice-test values match your screenshots.");
  const { readings, picks, extraction } = parsed.data;
  if (extraction.source === "admin_sample" && !allowAdminSample) {
    throw new SnapshotApprovalError("Admin access required for sample analytics.");
  }
  const { extractedAt, confirmedAt } = checkApprovalTimes(parsed.data, realNow, {
    stale: "Upload fresh practice-test screenshots before saving.",
    early: "Confirm the practice test after reviewing it.",
  });
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

export type PreparedWeeklyUpload = ReturnType<typeof prepareWeeklyUpload>;

export function prepareWeeklyUpload(input: unknown, { clock, schedules, allowAdminSample, scanningOff }: {
  clock: StudentClock;
  schedules: PersistedWeeklySchedule[];
  allowAdminSample: boolean;
  scanningOff: ScanningOff;
}) {
  const needs = uploadNeeds(clock.now, schedules);
  const target = TargetWeek.safeParse(input);
  if (!needs || !target.success || target.data.weekOf !== needs.weekOf) throw new SnapshotApprovalError(STALE_PAGE);
  const parsed = WeeklyUploadApprovalSchema.safeParse(input);
  if (!parsed.success) throw new SnapshotApprovalError("Confirm that the reviewed values match your screenshots.");
  const score = ScoreSchema.safeParse(parsed.data.currentScore);
  if (!score.success) throw new SnapshotApprovalError(`Enter a score from ${MIN_SCORE} to ${MAX_SCORE}.`);
  const { rows, extraction, confirmation } = parsed.data.analytics;
  const snapshot = prepareApprovedSnapshot({ ...summarizeApprovedRows(rows), extraction, confirmation }, clock.now, clock.real, {
    allowAdminSample,
    ...snapshotWeekOptions(clock),
  });
  const { practiceTest } = parsed.data;
  if (needs.hadPracticeTest && practiceTest == null && !scanningOff["practice-test-section"]) {
    throw new SnapshotApprovalError("Add this week's practice test before you confirm.");
  }
  if (!needs.hadPracticeTest && practiceTest != null) {
    throw new SnapshotApprovalError("This week's plan had no practice test. Confirm your analytics only.");
  }
  return {
    snapshot,
    practiceTest: practiceTest == null
      ? null
      : preparePracticeTest(practiceTest, clock.now, clock.real, snapshot.weekOf, allowAdminSample),
    currentScore: score.data,
  };
}
