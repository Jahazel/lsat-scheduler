import { plannedActivityMinutes, scheduleActivityId } from "./currentWeeklySchedule";
import { DAY_ORDER } from "./engine";
import { scheduledActivityCount } from "./scheduleCheckInSummary";
import type { ActivityCheckIn, WeeklySchedule } from "./types";

export interface ScheduleHistoryWeek {
  weekStartDate: string;
  total: number;
  done: number;
  skipped: number;
  plannedMinutes: number;
  completionPercent: number;
  isCurrent: boolean;
}

export interface ScheduleHistoryStats {
  averageDonePercent: number | null;
  streakWeeks: number | null;
  plannedMinutes: number;
  pastWeekCount: number;
  bestWeek: Pick<ScheduleHistoryWeek, "weekStartDate" | "completionPercent"> | null;
}

export const STREAK_THRESHOLD_PERCENT = 80;

export function groupCheckInsByScheduleId(checkIns: ActivityCheckIn[]) {
  return checkIns.reduce((byScheduleId, checkIn) => {
    const scheduleCheckIns = byScheduleId.get(checkIn.scheduleId) ?? [];
    scheduleCheckIns.push(checkIn);
    byScheduleId.set(checkIn.scheduleId, scheduleCheckIns);
    return byScheduleId;
  }, new Map<string, ActivityCheckIn[]>());
}

export function summarizeScheduleHistoryWeek({
  weekStartDate,
  schedule,
  checkIns,
  isCurrent,
}: {
  weekStartDate: string;
  schedule: WeeklySchedule;
  checkIns: ActivityCheckIn[];
  isCurrent: boolean;
}): ScheduleHistoryWeek {
  const activityIds = new Set<string>();
  const plannedMinutes = DAY_ORDER.reduce((weekMinutes, day) => {
    const dayMinutes = schedule.days[day].activities.reduce((minutes, activity, index) => {
      activityIds.add(scheduleActivityId(day, index));
      return minutes + plannedActivityMinutes(activity);
    }, 0);
    return weekMinutes + dayMinutes;
  }, 0);
  const relevantCheckIns = checkIns.filter((checkIn) => activityIds.has(checkIn.activityId));
  const total = scheduledActivityCount(schedule);
  const done = relevantCheckIns.filter((checkIn) => checkIn.status === "completed").length;
  const skipped = relevantCheckIns.filter((checkIn) => checkIn.status === "skipped").length;

  return {
    weekStartDate,
    total,
    done,
    skipped,
    plannedMinutes,
    completionPercent: total === 0 ? 0 : Math.round((done / total) * 100),
    isCurrent,
  };
}

export function summarizeHistoryStats(weeks: ScheduleHistoryWeek[]): ScheduleHistoryStats {
  const pastWeeks = weeks
    .filter((week) => !week.isCurrent)
    .toSorted((first, second) => second.weekStartDate.localeCompare(first.weekStartDate));
  const completionRatio = (week: ScheduleHistoryWeek) => week.total === 0 ? 0 : week.done / week.total;
  const averageDonePercent = pastWeeks.length === 0
    ? null
    : Math.round((pastWeeks.reduce((sum, week) => sum + completionRatio(week), 0) / pastWeeks.length) * 100);
  const streakWeeks = pastWeeks.length === 0
    ? null
    : pastWeeks.findIndex((week) => completionRatio(week) * 100 < STREAK_THRESHOLD_PERCENT);
  const bestPastWeek = pastWeeks.reduce<ScheduleHistoryWeek | null>(
    (best, week) => best === null || completionRatio(week) > completionRatio(best)
      ? week
      : best,
    null,
  );

  return {
    averageDonePercent,
    streakWeeks: streakWeeks === null ? null : streakWeeks === -1 ? pastWeeks.length : streakWeeks,
    plannedMinutes: weeks.reduce((sum, week) => sum + week.plannedMinutes, 0),
    pastWeekCount: pastWeeks.length,
    bestWeek: bestPastWeek && {
      weekStartDate: bestPastWeek.weekStartDate,
      completionPercent: bestPastWeek.completionPercent,
    },
  };
}
