import { planEndReason, type BillingRecord, type PlanStatus } from "./planStatus";
import { PLAN_PRICES, planPriceText, type PlanPrices } from "./planPrices";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";

export type PlanCardFacts = {
  status: "Free week" | "Active" | "Cancelled" | "Retrying" | "Lapsed";
  tone: "info" | "warning";
  plan: { name: string; price: string; per: string } | null;
  nextDate: { label: string; date: string } | null;
  note: string | null;
  action: "manage" | "pick";
};

const shortDate = new Intl.DateTimeFormat("en-US", { timeZone: SCHEDULE_TIMEZONE, weekday: "short", month: "short", day: "numeric" });

export const oneLineDate = (at: Date) => shortDate.format(at).replaceAll(" ", "\u00a0");

const lastDayOfPeriodEndingAt = (at: Date) => oneLineDate(new Date(at.getTime() - 1));

const WONT_RENEW = "It won't renew.";

/** The Account Plan card for a student, or null for an admin or a student who has not picked a plan yet. */
export function planCardFacts(
  status: PlanStatus, record: BillingRecord | null, realNow: Date, prices: PlanPrices = PLAN_PRICES,
): PlanCardFacts | null {
  if (status.kind === "admin" || status.kind === "no_plan") return null;
  if (status.kind === "lapsed") {
    return { status: "Lapsed", tone: "warning", plan: null, nextDate: null, note: "Pick a plan to get new weekly schedules.", action: "pick" };
  }
  const text = planPriceText(prices);
  const plan = status.plan === "weekly"
    ? { name: "Weekly", price: text.weekly, per: "a week" }
    : { name: "Monthly", price: text.monthly, per: "a month" };
  const facts = { tone: "info", plan, action: "manage" } as const;

  if (status.kind === "retrying") {
    return { ...facts, status: "Retrying", tone: "warning", nextDate: { label: "Update card by", date: oneLineDate(status.lapsesAt) }, note: "Payment failed." };
  }
  const cancelled = record !== null && planEndReason(record) !== null;
  if (status.kind === "free_week") {
    return cancelled
      ? { ...facts, status: "Cancelled", nextDate: { label: "Ends", date: lastDayOfPeriodEndingAt(status.endsAt) }, note: WONT_RENEW }
      : { ...facts, status: "Free week", nextDate: { label: "First charge", date: oneLineDate(status.endsAt) }, note: `Free week ends ${lastDayOfPeriodEndingAt(status.endsAt)}.` };
  }
  const periodEnd = record?.paidPeriodEndsAt && record.paidPeriodEndsAt > realNow ? record.paidPeriodEndsAt : null;
  return cancelled
    ? { ...facts, status: "Cancelled", nextDate: periodEnd && { label: "Ends", date: lastDayOfPeriodEndingAt(periodEnd) }, note: WONT_RENEW }
    : { ...facts, status: "Active", nextDate: periodEnd && { label: "Renews", date: oneLineDate(periodEnd) }, note: null };
}
