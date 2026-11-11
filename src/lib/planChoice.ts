import { localDateInTimezone } from "./currentWeeklySchedule";
import { planPriceText, type PlanPrices } from "./planPrices";
import { isoDateInWeek } from "./scheduleReasonText";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";

export const PLAN_NAMES = ["weekly", "monthly"] as const;
export type PlanName = (typeof PLAN_NAMES)[number];

export const isPlanName = (value: unknown): value is PlanName => PLAN_NAMES.includes(value as PlanName);

export type PlanOption = { name: string; price: string; per: string; every: string; saving: string | null };

export type PlanChoiceOffer = {
  plans: Record<PlanName, PlanOption>;
  freeWeek: { endsLong: string; endsShort: string; firstChargeShort: string } | null;
  renews: Record<PlanName, string>;
};

const shortDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const isoDay = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

/** Stripe renews a monthly plan on the same day of the month, or on the month's last day when that day does not exist. */
function oneMonthLater(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

export function planChoiceOffer(prices: PlanPrices, freeWeekEndsAt: Date | null, realNow: Date): PlanChoiceOffer {
  const text = planPriceText(prices);
  const today = localDateInTimezone(realNow, SCHEDULE_TIMEZONE);
  const firstCharge = freeWeekEndsAt ? localDateInTimezone(freeWeekEndsAt, SCHEDULE_TIMEZONE) : null;
  return {
    plans: {
      weekly: { name: "Weekly", price: text.weekly, per: "a week", every: "each week", saving: null },
      monthly: { name: "Monthly", price: text.monthly, per: "a month", every: "each month", saving: text.monthlySaving },
    },
    freeWeek: firstCharge ? {
      endsLong: longDate.format(isoDay(isoDateInWeek(firstCharge, -1))),
      endsShort: shortDate.format(isoDay(isoDateInWeek(firstCharge, -1))),
      firstChargeShort: shortDate.format(isoDay(firstCharge)),
    } : null,
    renews: {
      weekly: shortDate.format(isoDay(isoDateInWeek(today, 7))),
      monthly: shortDate.format(isoDay(oneMonthLater(today))),
    },
  };
}
