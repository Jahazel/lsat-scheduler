import { remainingActivityCount, scheduledActivityCount } from "./scheduleCheckInSummary";
import type { ActivityCheckIn, PersistedWeeklySchedule, WeeklySchedule } from "./types";

interface WeekDoneCount {
  done: number;
  total: number;
  completionPercent: number;
}

export interface PastWeek extends WeekDoneCount {
  weekStartDate: string;
  label: string;
}

export interface PastWeekMonth {
  month: string;
  weeks: PastWeek[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function countWeekDone(schedule: WeeklySchedule, checkIns: ActivityCheckIn[]): WeekDoneCount {
  const total = scheduledActivityCount(schedule);
  const done = total - remainingActivityCount(schedule, checkIns);
  return { done, total, completionPercent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function weekLabel(monday: Date) {
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const end = sunday.getUTCMonth() === monday.getUTCMonth() ? String(sunday.getUTCDate()) : monthDay.format(sunday);
  return `${monthDay.format(monday)} – ${end}`;
}

type SavedWeek = Pick<PersistedWeeklySchedule, "id" | "weekStartDate" | "schedule">;

type ProgressRoute<Saved extends SavedWeek> =
  | { kind: "this_week" }
  | { kind: "list"; months: PastWeekMonth[] }
  | { kind: "week"; schedule: Saved; checkIns: ActivityCheckIn[]; week: PastWeek; older?: PastWeek; newer?: PastWeek };

function pastWeeksNewestFirst<Saved extends SavedWeek>(schedules: Saved[], currentWeekStartDate: string) {
  return schedules
    .filter((saved) => saved.weekStartDate < currentWeekStartDate)
    .toSorted((first, second) => second.weekStartDate.localeCompare(first.weekStartDate));
}

function summarize(saved: SavedWeek, checkIns: ActivityCheckIn[]): PastWeek {
  return {
    weekStartDate: saved.weekStartDate,
    label: weekLabel(new Date(`${saved.weekStartDate}T00:00:00.000Z`)),
    ...countWeekDone(saved.schedule, checkIns.filter((checkIn) => checkIn.scheduleId === saved.id)),
  };
}

export function listPastWeekMonths({
  schedules,
  checkIns,
  currentWeekStartDate,
}: {
  schedules: SavedWeek[];
  checkIns: ActivityCheckIn[];
  currentWeekStartDate: string;
}): PastWeekMonth[] {
  const months: PastWeekMonth[] = [];
  for (const saved of pastWeeksNewestFirst(schedules, currentWeekStartDate)) {
    const month = monthYear.format(new Date(`${saved.weekStartDate}T00:00:00.000Z`));
    let group = months.at(-1);
    if (group?.month !== month) {
      group = { month, weeks: [] };
      months.push(group);
    }
    group.weeks.push(summarize(saved, checkIns));
  }
  return months;
}

export function resolveProgressRoute<Saved extends SavedWeek>({
  schedules,
  checkIns,
  currentWeekStartDate,
  requestedWeek,
}: {
  schedules: Saved[];
  checkIns: ActivityCheckIn[];
  currentWeekStartDate: string;
  requestedWeek: string | undefined;
}): ProgressRoute<Saved> {
  if (requestedWeek === currentWeekStartDate) return { kind: "this_week" };
  const pastWeeks = pastWeeksNewestFirst(schedules, currentWeekStartDate);
  const index = pastWeeks.findIndex((saved) => saved.weekStartDate === requestedWeek);
  if (index === -1) return { kind: "list", months: listPastWeekMonths({ schedules, checkIns, currentWeekStartDate }) };
  const schedule = pastWeeks[index]!;
  const older = pastWeeks[index + 1];
  const newer = pastWeeks[index - 1];
  return {
    kind: "week",
    schedule,
    checkIns: checkIns.filter((checkIn) => checkIn.scheduleId === schedule.id),
    week: summarize(schedule, checkIns),
    older: older && summarize(older, checkIns),
    newer: newer && summarize(newer, checkIns),
  };
}
