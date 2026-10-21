import { DAY_ORDER } from "./engine";
import { scheduleActivityId } from "./currentWeeklySchedule";
import type { ActivityCheckIn, WeeklySchedule } from "./types";

export function formatScheduleWeekOf(weekOf: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${weekOf}T00:00:00.000Z`));
}

export function scheduledActivityCount(schedule: WeeklySchedule) {
  return DAY_ORDER.reduce((total, day) => total + schedule.days[day].activities.length, 0);
}

export function remainingActivityCount(schedule: WeeklySchedule, checkIns: ActivityCheckIn[]) {
  const doneActivityIds = new Set(checkIns.filter(({ status }) => status === "completed").map(({ activityId }) => activityId));

  return DAY_ORDER.reduce(
    (total, day) => total + schedule.days[day].activities.filter((_, index) => !doneActivityIds.has(scheduleActivityId(day, index))).length,
    0,
  );
}
