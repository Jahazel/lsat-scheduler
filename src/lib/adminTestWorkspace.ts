import { isAdminUser } from "@/lib/accessControl";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";
import { MAX_AHEAD_DAYS, addDays } from "./walkthrough";

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
  const today = current.simulatedDate ?? dateInScheduleTimezone(real);
  if (next <= today) throw new Error("Choose a later date.");
  if (next > addDays(today, MAX_AHEAD_DAYS)) throw new Error(`Choose a date within ${MAX_AHEAD_DAYS} days.`);
  if (
    !(await repository.moveDate(userId, current.simulatedDate ?? null, next))
  ) {
    throw new Error("The simulated date changed. Refresh and try again.");
  }
}

export interface AdminTestWrites {
  // This write deletes activity check-ins with their weekly schedule.
  deleteSchedules(studentId: string): Promise<void>;
  deleteSnapshots(studentId: string): Promise<void>;
  deletePracticeTestResults(studentId: string): Promise<void>;
  deleteStudent(studentId: string, userId: string): Promise<void>;
  clearSimulatedDate(userId: string): Promise<void>;
}

export interface AdminTestRepositories {
  clock: AdminClockRepository;
  findStudent(userId: string): Promise<{ id: string } | null>;
  inTransaction(work: (writes: AdminTestWrites) => Promise<void>): Promise<void>;
}

export async function resetTestWorkspace(
  userId: string,
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
      await writes.deleteStudent(student.id, userId);
    }
    await writes.clearSimulatedDate(userId);
  });
}
