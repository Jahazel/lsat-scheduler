import { isAdminUser } from "@/lib/accessControl";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";
import { currentWeekInTimezone } from "./currentWeeklySchedule";
import type { ApprovedAnalyticsSnapshot } from "./types";
import {
  generateSampleAnalytics,
  type SampleDirection,
} from "./sampleAnalytics";
import { mockRules } from "./mockData";
import { PASSAGE_TYPES } from "./analyticsReview";
import { PT158_FIXTURES } from "./practiceTestFixtures/pt158";
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

export type StudentClock = { now: Date; real: Date; simulated: boolean };

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
  return (await resolveStudentClock(user, real, repository)).now;
}

export async function resolveStudentClock(
  user: { id?: string; role?: string },
  real: Date,
  repository: AdminClockRepository,
): Promise<StudentClock> {
  if (!isAdminUser(user) || !user.id) return { now: real, real, simulated: false };
  const current = await repository.findUser(user.id);
  return clockForVerifiedUser(current, real);
}

// The caller supplies a database record, never a session claim.
export function clockForVerifiedUser(
  current: { role: string; simulatedDate?: string | null } | null,
  real: Date,
): StudentClock {
  return isAdminUser(current) && current.simulatedDate
    ? { now: timeOnDate(current.simulatedDate, real), real, simulated: true }
    : { now: real, real, simulated: false };
}

export function timeForVerifiedUser(
  current: { role: string; simulatedDate?: string | null } | null,
  real: Date,
) {
  return clockForVerifiedUser(current, real).now;
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

export interface AdminTestWrites {
  // This write deletes activity check-ins with their weekly schedule.
  deleteSchedules(studentId: string, weekStartDate?: string): Promise<number>;
  deleteSnapshots(studentId: string): Promise<void>;
  deletePracticeTestResults(studentId: string): Promise<void>;
  deleteStudent(studentId: string, userId: string): Promise<void>;
  clearSimulatedDate(userId: string): Promise<void>;
}

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
  inTransaction(work: (writes: AdminTestWrites) => Promise<void>): Promise<void>;
}

export async function rebuildTestWeek(
  userId: string,
  real: Date,
  repositories: AdminTestRepositories,
) {
  const user = await repositories.clock.findUser(userId);
  if (!isAdminUser(user)) throw new Error("Admin access required.");
  const student = await repositories.findStudent(userId);
  if (!student) throw new Error("There is no weekly schedule to rebuild.");
  const now = clockForVerifiedUser(user, real).now;
  await repositories.inTransaction(async (writes) => {
    const deletedCount = await writes.deleteSchedules(
      student.id,
      currentWeekInTimezone(now, SCHEDULE_TIMEZONE),
    );
    if (deletedCount === 0)
      throw new Error("There is no weekly schedule to rebuild.");
  });
}

export async function resetTestWorkspace(
  userId: string,
  scope: ResetScope,
  repositories: AdminTestRepositories,
) {
  const user = await repositories.clock.findUser(userId);
  if (!isAdminUser(user)) throw new Error("Admin access required.");
  const student = await repositories.findStudent(userId);
  await repositories.inTransaction(async (writes) => {
    if (student) {
      await writes.deleteSchedules(student.id);
      await writes.deleteSnapshots(student.id);
      await writes.deletePracticeTestResults(student.id);
      if (scope === "everything")
        await writes.deleteStudent(student.id, userId);
    }
    await writes.clearSimulatedDate(userId);
  });
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
    ...PASSAGE_TYPES.map((type) => ({
      type,
      category: "passage" as const,
      accuracy: Math.round(values.rcAccuracyByType[type]! * 100),
    })),
  ];
  return rows;
}

/** The tutor's PrepTest 158 sections, read as a sample practice test for an admin's weekly upload. */
export function samplePracticeTestSections() {
  return PT158_FIXTURES.flatMap(({ reading }) => (reading.page === "section_review" ? [reading] : []));
}
