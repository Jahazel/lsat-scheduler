import { isAdminUser } from "@/lib/accessControl";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";
import { currentWeekInTimezone } from "./currentWeeklySchedule";
import type { ApprovedAnalyticsSnapshot } from "./types";
import {
  generateSampleAnalytics,
  type SampleDirection,
} from "./sampleAnalytics";
import { mockRules } from "./mockData";
import type { AnalyticsExtractedRow } from "./types";

export interface AdminClockRepository {
  findUser(
    userId: string,
  ): Promise<{ role: string; simulatedDate?: string | null } | null>;
  moveDate(
    userId: string,
    expected: string | null,
    next: string,
  ): Promise<boolean>;
}

export function dateInScheduleTimezone(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function localTimeParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: string) =>
    Number(parts.find((p) => p.type === name)?.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

// Resolve the target date's UTC offset, rather than carrying the real day's
// offset across a daylight saving boundary. A skipped spring hour moves forward.
function timeOnDate(date: string, real: Date) {
  const time = localTimeParts(real);
  const [year, month, day] = date.split("-").map(Number);
  const wall = Date.UTC(
    year,
    month - 1,
    day,
    time.hour,
    time.minute,
    time.second,
    real.getUTCMilliseconds(),
  );
  let result = wall + 6 * 60 * 60 * 1000;
  const seen = new Set<number>();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = localTimeParts(new Date(result));
    const delta =
      wall -
      Date.UTC(
        local.year,
        local.month - 1,
        local.day,
        local.hour,
        local.minute,
        local.second,
        real.getUTCMilliseconds(),
      );
    if (!delta) break;
    seen.add(result);
    const next = result + delta;
    if (seen.has(next)) {
      result = Math.max(result, next);
      break;
    }
    result = next;
  }
  return new Date(result);
}

export async function resolveStudentTime(
  user: { id?: string; role?: string },
  real: Date,
  repository: AdminClockRepository,
) {
  if (!isAdminUser(user) || !user.id) return real;
  const current = await repository.findUser(user.id);
  return timeForVerifiedUser(current, real);
}

// The caller supplies a database record, never a session claim.
export function timeForVerifiedUser(
  current: { role: string; simulatedDate?: string | null } | null,
  real: Date,
) {
  return isAdminUser(current) && current.simulatedDate
    ? timeOnDate(current.simulatedDate, real)
    : real;
}

export async function moveSimulatedDate(
  userId: string,
  next: string,
  real: Date,
  repository: AdminClockRepository,
) {
  const current = await repository.findUser(userId);
  if (!isAdminUser(current)) throw new Error("Admin access required.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(next) ||
    Number.isNaN(Date.parse(next)) ||
    new Date(next).toISOString().slice(0, 10) !== next
  ) {
    throw new Error("Choose a valid calendar date.");
  }
  if (next <= (current.simulatedDate ?? dateInScheduleTimezone(real)))
    throw new Error("Choose a later date.");
  if (
    !(await repository.moveDate(userId, current.simulatedDate ?? null, next))
  ) {
    throw new Error("The simulated date changed. Refresh and try again.");
  }
}

export type ResetScope = "test-data" | "everything";

export interface AdminTestRepositories {
  clock: AdminClockRepository;
  findStudent(
    userId: string,
  ): Promise<{ id: string; currentScore: number } | null>;
  approvedSnapshots(
    studentId: string,
  ): Promise<
    (ApprovedAnalyticsSnapshot & { extraction?: { source: string } })[]
  >;
  // These operations atomically delete schedules with their check-ins.
  deleteSchedules(studentId: string, weekStartDate?: string): Promise<void>;
  reset(
    userId: string,
    studentId: string | null,
    scope: ResetScope,
  ): Promise<void>;
}

export async function rebuildTestWeek(
  userId: string,
  real: Date,
  repositories: AdminTestRepositories,
) {
  const student = await repositories.findStudent(userId);
  if (!student) return;
  const now = await resolveStudentTime(
    { id: userId, role: "admin" },
    real,
    repositories.clock,
  );
  await repositories.deleteSchedules(
    student.id,
    currentWeekInTimezone(now, SCHEDULE_TIMEZONE),
  );
}

export async function resetTestWorkspace(
  userId: string,
  scope: ResetScope,
  repositories: AdminTestRepositories,
) {
  const student = await repositories.findStudent(userId);
  await repositories.reset(userId, student?.id ?? null, scope);
}

export async function generateTestAnalytics(
  userId: string,
  direction: SampleDirection,
  repositories: AdminTestRepositories,
  random = Math.random,
) {
  const student = await repositories.findStudent(userId);
  if (!student)
    throw new Error("Complete onboarding before generating a sample.");
  const snapshots = await repositories.approvedSnapshots(student.id);
  const previous =
    [...snapshots].sort((a, b) =>
      b.approvedAt.localeCompare(a.approvedAt),
    )[0] ?? null;
  const regularTypes = [
    ...mockRules.lrStemTypes,
    ...mockRules.lrLogicExceptions,
  ];
  const restrictedTypes = mockRules.lrLogicTypes.filter(
    (type) => !mockRules.lrLogicExceptions.includes(type),
  );
  const values = generateSampleAnalytics({
    previous,
    direction,
    currentScore: student.currentScore,
    earlierSampleCount: snapshots.filter(
      (s) => s.extraction?.source === "admin_sample",
    ).length,
    regularTypes,
    restrictedTypes,
    random,
  });
  const rows: AnalyticsExtractedRow[] = [
    ...regularTypes.map((type) => ({
      type,
      category: "regular" as const,
      accuracy: Math.round(values.lrAccuracyByType[type]! * 100),
    })),
    ...restrictedTypes.map((type) => ({
      type,
      category: "restricted" as const,
      isTopPriority: values.lrTopPriorityLogicTypes.includes(type),
    })),
  ];
  return rows;
}
