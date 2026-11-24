import { postgresActivityCheckIns } from "./activityCheckInRepository";
import { isHeldWeek, type BillingRecord } from "./planStatus";
import { listPastWeekMonths, resolveProgressRoute } from "./progressHistory";
import { postgresCurrentWeekRepositories } from "./weeklyScheduleRepository";

/** A student's saved weeks before this week, without the held week, resolved for the requested week. */
export async function loadPastWeeks({
  studentId,
  plan,
  thisWeekStart,
  requestedWeek,
}: {
  studentId: string;
  plan: BillingRecord | null;
  thisWeekStart: string;
  requestedWeek: string | undefined;
}) {
  const saved = await postgresCurrentWeekRepositories.weeklySchedules.listBeforeWeek(studentId, thisWeekStart);
  const schedules = saved.filter((schedule) => !isHeldWeek(plan, schedule.weekStartDate));
  const checkIns = await postgresActivityCheckIns.listForSchedules(schedules.map((schedule) => schedule.id));
  const weeks = { schedules, checkIns, currentWeekStartDate: thisWeekStart };
  const route = resolveProgressRoute({ ...weeks, requestedWeek });
  return {
    count: schedules.length,
    route,
    months: route.kind === "list" ? route.months : listPastWeekMonths(weeks),
  };
}
