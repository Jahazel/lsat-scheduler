import { DAY_ORDER, generateWeek } from "./engine";
import type {
  AnalyticsSnapshot,
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
    create(schedule: PersistedWeeklySchedule): Promise<PersistedWeeklySchedule>;
  };
}

export type LoadOrGenerateCurrentWeekResult =
  | { kind: "analytics_required" }
  | { kind: "schedule"; schedule: PersistedWeeklySchedule };

interface LoadOrGenerateCurrentWeekInput extends CurrentWeekRepositories {
  studentId: string;
  student: Student;
  studentName: string;
  rules: RulesConfig;
  policyVersion: string;
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
  for (const day of DAY_ORDER.slice(0, currentIndex)) {
    days[day] = { day, type: "rest", activities: [], totalMinutes: 0 };
  }
  return { ...schedule, days };
}

function duplicateSchedule(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

export async function loadOrGenerateCurrentWeek(
  input: LoadOrGenerateCurrentWeekInput
): Promise<LoadOrGenerateCurrentWeekResult> {
  const now = input.now();
  const weekStartDate = currentWeekInTimezone(now, input.timezone);
  const existing = await input.weeklySchedules.findByStudentAndWeek(input.studentId, weekStartDate);
  if (existing) return { kind: "schedule", schedule: existing };

  const snapshots = newestApprovedSnapshots(await input.snapshots.listEligibleForStudent(input.studentId));
  if (snapshots.length === 0) return { kind: "analytics_required" };

  const analytics = analyticsTrend(snapshots, weekStartDate);
  const schedule = remainingSchedule(
    generateWeek(input.student, analytics, input.rules, input.studentName),
    currentDayInTimezone(now, input.timezone)
  );
  const saturdayCapacity = input.student.weekendHours * 60;
  schedule.saturdayOverageMinutes = Math.max(0, schedule.days.SATURDAY.totalMinutes - saturdayCapacity);
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
      remainingDays: DAY_ORDER.slice(DAY_ORDER.indexOf(currentDayInTimezone(now, input.timezone))),
      analytics,
      priorWeekProgress: {
        source: "unavailable",
        skippedPlannedMinutes: 0,
        totalPlannedMinutes: 0,
        skipShare: 0,
        workloadReductionPercent: 0,
      },
    },
    policyVersion: input.policyVersion,
  };
  try {
    return { kind: "schedule", schedule: await input.weeklySchedules.create(saved) };
  } catch (error) {
    if (!duplicateSchedule(error)) throw error;
    const concurrent = await input.weeklySchedules.findByStudentAndWeek(input.studentId, weekStartDate);
    if (!concurrent) throw error;
    return { kind: "schedule", schedule: concurrent };
  }
}
