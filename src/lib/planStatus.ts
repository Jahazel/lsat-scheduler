import { currentWeekInTimezone, localDateInTimezone } from "./currentWeeklySchedule";
import { isoDateInWeek } from "./scheduleReasonText";
import type { billingRecords } from "./postgresSchema";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";

type BillingRow = typeof billingRecords.$inferSelect;
type PlanName = BillingRow["plan"];
type StripeStatus = BillingRow["stripeStatus"];

export type BillingRecord = Pick<BillingRow,
  "plan" | "stripeStatus" | "freeWeekEndsAt" | "paidPeriodEndsAt" | "firstChargeSucceeded" | "renewalFailedAt" | "cancelAtPeriodEnd">;

export type PlanStatus =
  | { kind: "admin" }
  | { kind: "no_plan" }
  | { kind: "free_week"; plan: PlanName; endsAt: Date }
  | { kind: "paid"; plan: PlanName }
  | { kind: "retrying"; plan: PlanName; lapsesAt: Date }
  | { kind: "lapsed" };

const RETRYING_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_ENDED: readonly StripeStatus[] = ["canceled", "unpaid", "incomplete_expired", "paused"];
const FIRST_CHARGE_FAILED: readonly StripeStatus[] = ["past_due", "incomplete", ...PLAN_ENDED];

export const PLAN_REFUSAL = "Pick a plan to get new weekly schedules.";

export function planStatus(role: string, record: BillingRecord | null, realNow: Date): PlanStatus {
  if (role === "admin") return { kind: "admin" };
  if (!record) return { kind: "no_plan" };
  const { plan, stripeStatus } = record;

  if (!record.firstChargeSucceeded) {
    if (!record.freeWeekEndsAt) return { kind: "no_plan" };
    if (realNow < record.freeWeekEndsAt) return { kind: "free_week", plan, endsAt: record.freeWeekEndsAt };
    return FIRST_CHARGE_FAILED.includes(stripeStatus) ? { kind: "lapsed" } : { kind: "paid", plan };
  }

  if (PLAN_ENDED.includes(stripeStatus)) {
    return record.paidPeriodEndsAt && realNow < record.paidPeriodEndsAt ? { kind: "paid", plan } : { kind: "lapsed" };
  }
  if (record.renewalFailedAt && stripeStatus === "past_due") {
    const lapsesAt = new Date(record.renewalFailedAt.getTime() + RETRYING_DAYS * DAY_MS);
    return realNow < lapsesAt ? { kind: "retrying", plan, lapsesAt } : { kind: "lapsed" };
  }
  return { kind: "paid", plan };
}

const PLAN_STATUS_LABELS: Record<PlanStatus["kind"], string> = {
  admin: "Admin",
  no_plan: "No plan",
  free_week: "Free week",
  paid: "Paid",
  retrying: "Retrying",
  lapsed: "Lapsed",
};

export function planStatusLabel(status: PlanStatus) {
  return PLAN_STATUS_LABELS[status.kind];
}

export function mayStartWeeklyUpload(status: PlanStatus) {
  return status.kind !== "no_plan" && status.kind !== "lapsed";
}

export function isHeldWeek(record: BillingRecord | null, weekStartDate: string) {
  if (!record?.freeWeekEndsAt || record.firstChargeSucceeded) return false;
  return weekStartDate === localDateInTimezone(record.freeWeekEndsAt, SCHEDULE_TIMEZONE);
}

export function freeWeekEnd(onboardingFinishedAt: Date) {
  const today = localDateInTimezone(onboardingFinishedAt, SCHEDULE_TIMEZONE);
  const monday = currentWeekInTimezone(onboardingFinishedAt, SCHEDULE_TIMEZONE);
  const firstFullWeek = today === monday ? monday : isoDateInWeek(monday, 7);
  return midnightInScheduleTimezone(isoDateInWeek(firstFullWeek, 7));
}

const offsetFormat = new Intl.DateTimeFormat("en-US", { timeZone: SCHEDULE_TIMEZONE, timeZoneName: "longOffset" });

function offsetMs(at: number) {
  const name = offsetFormat.formatToParts(at).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
}

function midnightInScheduleTimezone(isoDate: string) {
  const wall = Date.parse(`${isoDate}T00:00:00.000Z`);
  const guess = wall - offsetMs(wall);
  return new Date(wall - offsetMs(guess));
}
