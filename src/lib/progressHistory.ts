import { remainingActivityCount, scheduledActivityCount } from "./scheduleCheckInSummary";
import type { ActivityCheckIn, PersistedWeeklySchedule, WeeklySchedule } from "./types";

interface WeekDoneCount {
  done: number;
  total: number;
  completionPercent: number;
}

interface PastWeek extends WeekDoneCount {
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

export function countWeekDone(schedule: WeeklySchedule, checkIns: ActivityCheckIn[]): WeekDoneCount {
  const total = scheduledActivityCount(schedule);
  const done = total - remainingActivityCount(schedule, checkIns);
  return { done, total, completionPercent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function weekLabel(monday: Date) {
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const end = sunday.getUTCMonth() === monday.getUTCMonth() ? String(sunday.getUTCDate()) : monthDay.format(sunday);
  return `${monthDay.format(monday)} – ${end}`;
}

export function listPastWeekMonths({
  schedules,
  checkIns,
  currentWeekStartDate,
}: {
  schedules: Pick<PersistedWeeklySchedule, "id" | "weekStartDate" | "schedule">[];
  checkIns: ActivityCheckIn[];
  currentWeekStartDate: string;
}): PastWeekMonth[] {
  const months: PastWeekMonth[] = [];
  const pastSchedules = schedules
    .filter((saved) => saved.weekStartDate < currentWeekStartDate)
    .toSorted((first, second) => second.weekStartDate.localeCompare(first.weekStartDate));
  for (const saved of pastSchedules) {
    const monday = new Date(`${saved.weekStartDate}T00:00:00.000Z`);
    const month = monthYear.format(monday);
    let group = months.at(-1);
    if (group?.month !== month) {
      group = { month, weeks: [] };
      months.push(group);
    }
    group.weeks.push({
      weekStartDate: saved.weekStartDate,
      label: weekLabel(monday),
      ...countWeekDone(saved.schedule, checkIns.filter((checkIn) => checkIn.scheduleId === saved.id)),
    });
  }
  return months;
}
