import { DAY_ORDER, generateWeek } from "./engine";
import { isoDateInWeek, unscheduledDaySentence } from "./scheduleReasonText";
import type {
  AnalyticsSnapshot,
  Activity,
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
    /** Inserts once per student and week, returning the saved record on a conflict. */
    create(schedule: PersistedWeeklySchedule): Promise<PersistedWeeklySchedule>;
  };
  activityCheckIns: {
    ensureForSchedule(schedule: PersistedWeeklySchedule): Promise<void>;
  };
}

export type LoadOrGenerateCurrentWeekResult =
  | { kind: "analytics_required" }
  | { kind: "schedule"; schedule: PersistedWeeklySchedule };

// The scheduling policy version recorded on every newly created weekly
// schedule. Saved schedules keep the version they were created with.
export const SCHEDULING_POLICY_VERSION = "adaptive-weekly-schedule-v3";

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

export function localDateInTimezone(now: Date, timezone: string) {
  const { year, month, day } = localDateParts(now, timezone);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

export function currentWeekInTimezone(now: Date, timezone: string) {
  const localDate = new Date(`${localDateInTimezone(now, timezone)}T00:00:00.000Z`);
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

function weightedAccuracy<Type extends string>(maps: (Partial<Record<Type, number>> | undefined)[]) {
  const trend: Partial<Record<Type, number>> = {};
  const types = new Set(maps.flatMap((map) => Object.keys(map ?? {}) as Type[]));
  for (const type of types) {
    let weightedSum = 0;
    let weightTotal = 0;
    maps.forEach((map, index) => {
      const accuracy = map?.[type];
      if (accuracy !== undefined) {
        weightedSum += accuracy * TREND_WEIGHTS[index];
        weightTotal += TREND_WEIGHTS[index];
      }
    });
    if (weightTotal > 0) trend[type] = weightedSum / weightTotal;
  }
  return trend;
}

export function analyticsTrend(snapshots: ApprovedAnalyticsSnapshot[], weekOf: string): AnalyticsSnapshot {
  const window = newestApprovedSnapshots(snapshots).slice(0, 3);
  const rcAccuracyByType = weightedAccuracy(window.map((snapshot) => snapshot.rcAccuracyByType));
  return {
    weekOf,
    lrAccuracyByType: weightedAccuracy(window.map((snapshot) => snapshot.lrAccuracyByType)),
    lrTopPriorityLogicTypes: window[0].lrTopPriorityLogicTypes,
    ...(Object.keys(rcAccuracyByType).length > 0 && { rcAccuracyByType }),
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

  const eligibleSnapshots = await input.snapshots.listEligibleForStudent(input.studentId);
  if (freshSnapshotsForCurrentWeek(eligibleSnapshots, now, input.timezone).length === 0) {
    return { kind: "analytics_required" };
  }
  const snapshots = newestApprovedSnapshots(eligibleSnapshots).slice(0, 3);

  const analytics = analyticsTrend(snapshots, weekStartDate);
  const priorSchedule = await input.weeklySchedules.findByStudentAndWeek(
    input.studentId, previousWeekStartDate(weekStartDate)
  );
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
    }),
    currentDay
  );
  const saved: PersistedWeeklySchedule = {
    id: `${input.studentId}:${weekStartDate}`,
    studentId: input.studentId,
    weekStartDate,
    generatedAt: now.toISOString(),
    schedule,
    sourceSnapshotIds: snapshots.map((snapshot) => snapshot.id),
    generationInputs: {
      student: input.student,
      timezone: input.timezone,
      remainingDays: DAY_ORDER.slice(DAY_ORDER.indexOf(currentDay)),
      analytics,
      priorWeekPracticeTestReviewMinutes,
      priorScheduleIds: history.map((record) => record.id),
    },
    policyVersion: SCHEDULING_POLICY_VERSION,
  };
  const created = await input.weeklySchedules.create(saved);
  await input.activityCheckIns.ensureForSchedule(created);
  return { kind: "schedule", schedule: created };
}
