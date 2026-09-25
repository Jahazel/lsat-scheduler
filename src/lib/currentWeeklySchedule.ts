import { DAY_ORDER, generateWeek } from "./engine";
import { isoDateInWeek, unscheduledDaySentence } from "./scheduleReasonText";
import type {
  AnalyticsSnapshot,
  Activity,
  ActivityCheckIn,
  ApprovedAnalyticsSnapshot,
  DayOfWeek,
  PersistedWeeklySchedule,
  RulesConfig,
  Student,
  WeeklySchedule,
} from "./types";

const TREND_WEIGHTS = [0.6, 0.3, 0.1];

export interface CurrentWeekRepositories {
  snapshots: {
    listEligibleForStudent(studentId: string): Promise<ApprovedAnalyticsSnapshot[]>;
  };
  weeklySchedules: {
    findByStudentAndWeek(studentId: string, weekStartDate: string): Promise<PersistedWeeklySchedule | null>;
    listBeforeWeek(studentId: string, weekStartDate: string): Promise<PersistedWeeklySchedule[]>;
    create(schedule: PersistedWeeklySchedule): Promise<PersistedWeeklySchedule>;
  };
  activityCheckIns: {
    listForSchedule(scheduleId: string): Promise<ActivityCheckIn[]>;
    ensureForSchedule(schedule: PersistedWeeklySchedule): Promise<void>;
  };
}

export type LoadOrGenerateCurrentWeekResult =
  | { kind: "analytics_required" }
  | { kind: "schedule"; schedule: PersistedWeeklySchedule };

// The scheduling policy version recorded on every newly created weekly
// schedule. Saved schedules keep the version they were created with.
export const SCHEDULING_POLICY_VERSION = "adaptive-weekly-schedule-v2";

interface LoadOrGenerateCurrentWeekInput extends CurrentWeekRepositories {
  studentId: string;
  student: Student;
  studentName: string;
  rules: RulesConfig;
  timezone: string;
  now: () => Date;
}

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return { year: Number(value("year")), month: Number(value("month")), day: Number(value("day")) };
}

export function currentWeekInTimezone(now: Date, timezone: string) {
  const { year, month, day } = localDateParts(now, timezone);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = localDate.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  localDate.setUTCDate(localDate.getUTCDate() + mondayOffset);
  return localDate.toISOString().slice(0, 10);
}

export function freshSnapshotsForCurrentWeek(
  snapshots: ApprovedAnalyticsSnapshot[],
  now: Date,
  timezone: string
) {
  const weekStartDate = currentWeekInTimezone(now, timezone);
  return snapshots.filter((snapshot) => currentWeekInTimezone(new Date(snapshot.approvedAt), timezone) === weekStartDate);
}

function currentDayInTimezone(now: Date, timezone: string): DayOfWeek {
  const { year, month, day } = localDateParts(now, timezone);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return DAY_ORDER[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
}

function newestApprovedSnapshots(snapshots: ApprovedAnalyticsSnapshot[]) {
  return [...snapshots].sort((a, b) => b.approvedAt.localeCompare(a.approvedAt) || a.id.localeCompare(b.id));
}

export function analyticsTrend(snapshots: ApprovedAnalyticsSnapshot[], weekOf: string): AnalyticsSnapshot {
  const window = newestApprovedSnapshots(snapshots).slice(0, 3);
  const lrAccuracyByType: AnalyticsSnapshot["lrAccuracyByType"] = {};
  const types = new Set(window.flatMap((snapshot) => Object.keys(snapshot.lrAccuracyByType)));
  for (const type of types) {
    let weightedAccuracy = 0;
    let weightTotal = 0;
    window.forEach((snapshot, index) => {
      const accuracy = snapshot.lrAccuracyByType[type as keyof typeof snapshot.lrAccuracyByType];
      if (accuracy !== undefined) {
        weightedAccuracy += accuracy * TREND_WEIGHTS[index];
        weightTotal += TREND_WEIGHTS[index];
      }
    });
    if (weightTotal > 0) {
      lrAccuracyByType[type as keyof typeof lrAccuracyByType] = weightedAccuracy / weightTotal;
    }
  }
  return {
    weekOf,
    lrAccuracyByType,
    lrTopPriorityLogicTypes: window[0].lrTopPriorityLogicTypes,
  };
}

function remainingSchedule(schedule: WeeklySchedule, currentDay: DayOfWeek): WeeklySchedule {
  const currentIndex = DAY_ORDER.indexOf(currentDay);
  const days = { ...schedule.days };
  let reasons = [...(schedule.reasons ?? [])];
  for (const day of DAY_ORDER.slice(0, currentIndex)) {
    if (days[day].type !== "rest") {
      days[day] = { day, type: "unscheduled", activities: [], totalMinutes: 0 };
      reasons = reasons.filter((reason) =>
        reason.placement.scope !== "day" || reason.placement.day !== day);
      reasons.push({ code: "unscheduled_day", placement: { scope: "day", day },
        sentence: unscheduledDaySentence(currentDay) });
    }
  }
  return { ...schedule, days, reasons };
}

function duplicateSchedule(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

function previousWeekStartDate(weekStartDate: string) {
  return isoDateInWeek(weekStartDate, -7);
}

export function scheduleActivityId(day: DayOfWeek, activityIndex: number) {
  return `${day}:${activityIndex}`;
}

export function plannedActivityMinutes(activity: Activity) {
  return activity.kind === "LR" || activity.kind === "RC"
    ? activity.drillMinutes + (activity.reviewMinutes ?? 0)
    : activity.minutes;
}

async function priorWeekProgress(
  repositories: CurrentWeekRepositories,
  priorSchedule: PersistedWeeklySchedule | null
) {
  if (!priorSchedule) {
    return {
      source: "unavailable" as const,
      skippedPlannedMinutes: 0,
      totalPlannedMinutes: 0,
      skipShare: 0,
      skipReductionPercent: 0,
    };
  }

  const checkIns = repositories.activityCheckIns
    ? await repositories.activityCheckIns.listForSchedule(priorSchedule.id)
    : [];
  const skippedActivityIds = new Set(
    checkIns.filter((checkIn) => checkIn.status === "skipped").map((checkIn) => checkIn.activityId)
  );
  let totalPlannedMinutes = 0;
  let skippedPlannedMinutes = 0;
  for (const day of DAY_ORDER) {
    priorSchedule.schedule.days[day].activities.forEach((activity, index) => {
      const minutes = plannedActivityMinutes(activity);
      totalPlannedMinutes += minutes;
      if (skippedActivityIds.has(scheduleActivityId(day, index))) skippedPlannedMinutes += minutes;
    });
  }
  const skipShare = totalPlannedMinutes === 0 ? 0 : skippedPlannedMinutes / totalPlannedMinutes;
  return {
    source: "immediately_preceding_schedule" as const,
    skippedPlannedMinutes,
    totalPlannedMinutes,
    skipShare,
    skipReductionPercent: Math.min(0.25, 0.25 * skipShare),
  };
}

export async function loadOrGenerateCurrentWeek(
  input: LoadOrGenerateCurrentWeekInput
): Promise<LoadOrGenerateCurrentWeekResult> {
  const now = input.now();
  const weekStartDate = currentWeekInTimezone(now, input.timezone);
  const existing = await input.weeklySchedules.findByStudentAndWeek(input.studentId, weekStartDate);
  if (existing) {
    await input.activityCheckIns.ensureForSchedule(existing);
    return { kind: "schedule", schedule: existing };
  }

  const snapshots = newestApprovedSnapshots(
    freshSnapshotsForCurrentWeek(await input.snapshots.listEligibleForStudent(input.studentId), now, input.timezone)
  );
  if (snapshots.length === 0) return { kind: "analytics_required" };

  const analytics = analyticsTrend(snapshots, weekStartDate);
  const priorSchedule = await input.weeklySchedules.findByStudentAndWeek(
    input.studentId, previousWeekStartDate(weekStartDate)
  );
  const priorWeekProgressFacts = await priorWeekProgress(input, priorSchedule);
  const history = await input.weeklySchedules.listBeforeWeek(input.studentId, weekStartDate);
  const priorSunday = priorSchedule?.schedule.days.SUNDAY;
  const priorWeekPracticeTestReviewMinutes = priorSunday?.type === "practice_test"
    ? priorSunday.activities.find((activity) => activity.kind === "PT")?.minutes
    : undefined;
  const currentDay = currentDayInTimezone(now, input.timezone);
  const schedule = remainingSchedule(
    generateWeek(input.student, analytics, input.rules, input.studentName, {
      createdOn: currentDay,
      priorWeekPracticeTestReviewMinutes,
      priorSchedules: history.map((record) => record.schedule),
      skipReductionPercent: priorWeekProgressFacts.skipReductionPercent,
      skipShare: priorWeekProgressFacts.skipShare,
    }),
    currentDay
  );
  const saved: PersistedWeeklySchedule = {
    id: `${input.studentId}:${weekStartDate}`,
    studentId: input.studentId,
    weekStartDate,
    generatedAt: now.toISOString(),
    schedule,
    sourceSnapshotIds: snapshots.slice(0, 3).map((snapshot) => snapshot.id),
    generationInputs: {
      student: input.student,
      timezone: input.timezone,
      remainingDays: DAY_ORDER.slice(DAY_ORDER.indexOf(currentDay)),
      analytics,
      priorWeekProgress: priorWeekProgressFacts,
      priorWeekPracticeTestReviewMinutes,
      priorScheduleIds: history.map((record) => record.id),
    },
    policyVersion: SCHEDULING_POLICY_VERSION,
  };
  try {
    const created = await input.weeklySchedules.create(saved);
    await input.activityCheckIns.ensureForSchedule(created);
    return { kind: "schedule", schedule: created };
  } catch (error) {
    if (!duplicateSchedule(error)) throw error;
    const concurrent = await input.weeklySchedules.findByStudentAndWeek(input.studentId, weekStartDate);
    if (!concurrent) throw error;
    await input.activityCheckIns.ensureForSchedule(concurrent);
    return { kind: "schedule", schedule: concurrent };
  }
}
