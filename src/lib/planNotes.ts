import { localDateInTimezone } from "./currentWeeklySchedule";
import { PLAN_PRICES, planPriceText, type PlanPrices } from "./planPrices";
import type { BillingRecord, PlanStatus } from "./planStatus";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";

export type PlanNote = { lead: string; rest: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const FRIDAY_TO_FREE_WEEK_END_DAYS = 3;

const daysBetween = (fromIsoDate: string, toIsoDate: string) =>
  Math.round((Date.parse(toIsoDate) - Date.parse(fromIsoDate)) / DAY_MS);

function daysLeftInEndingFreeWeek(status: PlanStatus, realNow: Date) {
  if (status.kind !== "free_week") return null;
  const daysLeft = daysBetween(localDateInTimezone(realNow, SCHEDULE_TIMEZONE), localDateInTimezone(status.endsAt, SCHEDULE_TIMEZONE));
  return daysLeft >= 1 && daysLeft <= FRIDAY_TO_FREE_WEEK_END_DAYS ? daysLeft : null;
}

export function freeWeekEndingNote(
  status: PlanStatus, record: BillingRecord | null, realNow: Date, nextWeekSaved: boolean, prices: PlanPrices = PLAN_PRICES,
): PlanNote | null {
  const daysLeft = daysLeftInEndingFreeWeek(status, realNow);
  if (daysLeft === null || status.kind !== "free_week") return null;
  const sunday = daysLeft === 1;
  const lead = sunday ? "Your free week ends today." : "Your free week ends Sunday.";
  if (record?.cancelAtPeriodEnd) return { lead, rest: "You won't be charged." };

  const text = planPriceText(prices);
  const [name, price] = status.plan === "weekly" ? ["Weekly", text.weekly] : ["Monthly", text.monthly];
  const starts = `Your ${name} plan starts ${sunday ? "tomorrow" : "Monday"} at ${price}.`;
  return { lead, rest: nextWeekSaved ? `${starts} Your plan for next week appears then.` : starts };
}

export const hidesUploadReminder = (status: PlanStatus, record: BillingRecord | null, realNow: Date) =>
  record?.cancelAtPeriodEnd === true && daysLeftInEndingFreeWeek(status, realNow) !== null;
