import { DAY_ORDER } from "./engine";
import { scheduleActivityId } from "./currentWeeklySchedule";
import { isoDateInWeek } from "./scheduleReasonText";
import type { ActivityCheckIn, WeeklySchedule } from "./types";

export type WeekCount = { done: number; total: number; dueBeforeToday: number };

export function formatScheduleWeekOf(weekOf: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${weekOf}T00:00:00.000Z`));
}

export function weekNotes(schedule: WeeklySchedule) {
  return schedule.reasons?.filter((reason) => reason.placement.scope === "week").map((reason) => reason.sentence) ?? [];
}

export function scheduledActivityCount(schedule: WeeklySchedule) {
  return DAY_ORDER.reduce((total, day) => total + schedule.days[day].activities.length, 0);
}

export function doneActivityIds(checkIns: ActivityCheckIn[]) {
  return new Set(checkIns.filter(({ status }) => status === "completed").map(({ activityId }) => activityId));
}

export function remainingActivityCount(schedule: WeeklySchedule, checkIns: ActivityCheckIn[]) {
  const doneIds = doneActivityIds(checkIns);

  return DAY_ORDER.reduce(
    (total, day) => total + schedule.days[day].activities.filter((_, index) => !doneIds.has(scheduleActivityId(day, index))).length,
    0,
  );
}

export function activitiesDueBefore(schedule: WeeklySchedule, today: string) {
  return DAY_ORDER.reduce((due, day, index) => isoDateInWeek(schedule.weekOf, index) < today ? due + schedule.days[day].activities.length : due, 0);
}

export function weekPace({ done, total, dueBeforeToday }: WeekCount) {
  const lead = done - dueBeforeToday;
  const behind = done < total && lead < 0;
  return { behind, label: done === total ? "Week done" : behind ? `${-lead} behind` : lead > 0 ? `${lead} ahead` : "On pace" };
}
