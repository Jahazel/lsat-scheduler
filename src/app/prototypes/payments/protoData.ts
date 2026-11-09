import { planPriceText, type PlanPrices } from "@/lib/planPrices";

export type PlanName = "weekly" | "monthly";

export type ProtoData = {
  prices: PlanPrices;
  freeWeek: { endsShort: string; endsLong: string; firstChargeShort: string };
  // The plan the This week notes speak about, and the Mondays that start each week those notes appear in.
  plan: PlanName;
  weeks: { firstFree: string; lastFree: string; firstPaid: string; retrying: string; lapsed: string };
  retryBy: string;
  // The Account Plan card's dates once the plan is paid: the next renewal, and the last day of a cancelled paid period.
  paid: { renewsOn: string; endsOn: string };
  // A lapsed student picks a plan again: it starts today, and Stripe renews it on the same weekday or day of the month.
  restart: { today: string; weeklyRenews: string; monthlyRenews: string };
};

export const DATASETS = {
  demo: {
    prices: { weeklyCents: 1000, monthlyCents: 2999 },
    freeWeek: { endsShort: "Sun, Nov 22", endsLong: "Sunday, Nov 22", firstChargeShort: "Mon, Nov 23" },
    plan: "weekly",
    weeks: { firstFree: "2026-11-09", lastFree: "2026-11-16", firstPaid: "2026-11-23", retrying: "2026-12-07", lapsed: "2026-12-14" },
    retryBy: "Mon, Dec 14",
    paid: { renewsOn: "Mon, Nov 30", endsOn: "Sun, Nov 29" },
    restart: { today: "Wed, Dec 16", weeklyRenews: "Wed, Dec 23", monthlyRenews: "Sat, Jan 16" },
  },
  // Onboarding finished Mon, Dec 21: the longest free week (13 days), across the new year, with a price rise to $14.99 and $49.99.
  worst: {
    prices: { weeklyCents: 1499, monthlyCents: 4999 },
    freeWeek: { endsShort: "Sun, Jan 3", endsLong: "Sunday, Jan 3", firstChargeShort: "Mon, Jan 4" },
    plan: "monthly",
    // The renewal fails in the week across the new year, so the card deadline lands in the next year.
    weeks: { firstFree: "2026-12-21", lastFree: "2026-12-28", firstPaid: "2027-01-04", retrying: "2026-12-28", lapsed: "2027-01-04" },
    retryBy: "Mon, Jan 4",
    paid: { renewsOn: "Thu, Feb 4", endsOn: "Wed, Feb 3" },
    // Restarting on the 31st: Stripe moves the monthly renewal to the month's last day.
    restart: { today: "Sun, Jan 31", weeklyRenews: "Sun, Feb 7", monthlyRenews: "Sun, Feb 28" },
  },
  // Monthly costs more than 4⅓ weeks of Weekly, so there is no saving to show.
  "no-saving": {
    prices: { weeklyCents: 1000, monthlyCents: 4500 },
    freeWeek: { endsShort: "Sun, Nov 22", endsLong: "Sunday, Nov 22", firstChargeShort: "Mon, Nov 23" },
    plan: "weekly",
    weeks: { firstFree: "2026-11-09", lastFree: "2026-11-16", firstPaid: "2026-11-23", retrying: "2026-12-07", lapsed: "2026-12-14" },
    retryBy: "Mon, Dec 14",
    paid: { renewsOn: "Mon, Nov 30", endsOn: "Sun, Nov 29" },
    restart: { today: "Wed, Dec 16", weeklyRenews: "Wed, Dec 23", monthlyRenews: "Sat, Jan 16" },
  },
} satisfies Record<string, ProtoData>;

export type DatasetName = keyof typeof DATASETS;
export const isDatasetName = (value: string | undefined): value is DatasetName => !!value && value in DATASETS;

export function plansFor(prices: PlanPrices) {
  const text = planPriceText(prices);
  return {
    weekly: { name: "Weekly", price: text.weekly, per: "a week", every: "each week", saving: undefined as string | undefined },
    monthly: { name: "Monthly", price: text.monthly, per: "a month", every: "each month", saving: monthlySaves(prices) ? text.monthlySaving : undefined },
  } satisfies Record<PlanName, unknown>;
}

const monthlySaves = ({ weeklyCents, monthlyCents }: PlanPrices) => Math.round((1 - monthlyCents / ((weeklyCents * 52) / 12)) * 100) >= 1;

export const TERMS = "Cancel anytime. You keep access until your paid week or month ends. No refunds for unused time.";

export const agreementLine = (every: string) => `By continuing, you agree your plan renews ${every} until you cancel.`;

export const STRIPE_NOTE = "You add your card on Stripe, then come back here.";

export type WeekState =
  | "free-start" | "free-friday" | "free-sunday" | "free-cancelled" | "free-saved"
  | "held" | "retrying" | "retrying-weekend" | "lapsed-failed" | "lapsed-ended";

export const WEEK_STATES: { id: WeekState; label: string }[] = [
  { id: "free-friday", label: "Free week · Friday" },
  { id: "free-sunday", label: "Free week · Sunday" },
  { id: "free-cancelled", label: "Free week · cancelled" },
  { id: "free-saved", label: "Free week · next week saved" },
  { id: "held", label: "Held weekly schedule" },
  { id: "retrying", label: "Retrying" },
  { id: "retrying-weekend", label: "Retrying · weekend" },
  { id: "lapsed-failed", label: "Lapsed · card failed" },
  { id: "lapsed-ended", label: "Lapsed · plan ended" },
  { id: "free-start", label: "Free week · first day (no note)" },
];

export type PlanNote = {
  tone: "info" | "warning";
  // The first sentence leads; variants that split a title from the body use it as the title.
  lead: string;
  rest?: string;
  action?: "update-card" | "pick-plan";
};

// A date that splits across lines ("Mon, / Jan 4") reads as two facts on a narrow phone.
const keepTogether = (text: string) => text.replaceAll(" ", "\u00a0");

export function planNote(state: WeekState, data: ProtoData): PlanNote | null {
  const plan = plansFor(data.prices)[data.plan];
  switch (state) {
    case "free-start":
      return null;
    case "free-friday":
      return { tone: "info", lead: "Your free week ends Sunday.", rest: `Your ${plan.name} plan starts Monday at ${plan.price}.` };
    case "free-sunday":
      return { tone: "info", lead: "Your free week ends today.", rest: `Your ${plan.name} plan starts tomorrow at ${plan.price}.` };
    case "free-cancelled":
      return { tone: "info", lead: "Your free week ends Sunday.", rest: "You won't be charged." };
    case "free-saved":
      return { tone: "info", lead: "Your free week ends Sunday.", rest: `Your ${plan.name} plan starts Monday at ${plan.price}. Your plan for next week appears then.` };
    case "held":
      return { tone: "info", lead: "Your week is ready.", rest: "It appears when your first payment goes through." };
    case "retrying":
    case "retrying-weekend":
      return { tone: "warning", lead: "Your last payment didn't go through.", rest: `Update your card by ${keepTogether(data.retryBy)} to keep your plan.`, action: "update-card" };
    case "lapsed-failed":
      return { tone: "warning", lead: "Your payment didn't go through.", rest: "Pick a plan to get new weekly schedules.", action: "pick-plan" };
    case "lapsed-ended":
      return { tone: "warning", lead: "Your plan has ended.", rest: "Pick a plan to get new weekly schedules.", action: "pick-plan" };
  }
}

const weekDay = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthLongDay = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

export const weekDates = (monday: string) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${monday}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return { day: weekDay.format(date), date: monthDay.format(date) };
  });

export const weekOf = (monday: string) => monthLongDay.format(new Date(`${monday}T00:00:00.000Z`));

export type PlanCardState = "free-week" | "free-cancelled" | "paid" | "paid-cancelled" | "retrying" | "lapsed";

export const PLAN_CARD_STATES: { id: PlanCardState; label: string }[] = [
  { id: "free-week", label: "Free week" },
  { id: "free-cancelled", label: "Free week · cancelled" },
  { id: "paid", label: "Paid" },
  { id: "paid-cancelled", label: "Paid · cancelled" },
  { id: "retrying", label: "Retrying" },
  { id: "lapsed", label: "Lapsed" },
];

export type PlanCardFacts = {
  status: "Free week" | "Active" | "Cancelled" | "Retrying" | "Lapsed";
  tone: "info" | "warning";
  plan: { name: string; price: string; per: string } | null;
  // What the rows do not already say; null when the rows say it all.
  detail: string | null;
  // The one date that matters next, shown as its own row.
  next: { label: string; date: string } | null;
  action: "manage" | "pick";
};

export function planCardFacts(state: PlanCardState, data: ProtoData): PlanCardFacts {
  const option = plansFor(data.prices)[data.plan];
  const plan = { name: option.name, price: option.price, per: option.per };
  const { endsShort, firstChargeShort } = data.freeWeek;
  switch (state) {
    case "free-week":
      return { status: "Free week", tone: "info", plan, detail: `Free week ends ${keepTogether(endsShort)}.`, next: { label: "First charge", date: firstChargeShort }, action: "manage" };
    case "free-cancelled":
      return { status: "Cancelled", tone: "info", plan, detail: "It won't renew.", next: { label: "Ends", date: endsShort }, action: "manage" };
    case "paid":
      return { status: "Active", tone: "info", plan, detail: null, next: { label: "Renews", date: data.paid.renewsOn }, action: "manage" };
    case "paid-cancelled":
      return { status: "Cancelled", tone: "info", plan, detail: "It won't renew.", next: { label: "Ends", date: data.paid.endsOn }, action: "manage" };
    case "retrying":
      return { status: "Retrying", tone: "warning", plan, detail: "Payment failed.", next: { label: "Update card by", date: data.retryBy }, action: "manage" };
    case "lapsed":
      return { status: "Lapsed", tone: "warning", plan: null, detail: "Pick a plan to get new weekly schedules.", next: null, action: "pick" };
  }
}

export const STARTING_STATES = [
  { id: "waiting", label: "Waiting for Stripe" },
  { id: "slow", label: "Slow (after about 20 s)" },
  { id: "lapsed-waiting", label: "Lapsed · waiting" },
];

export const RESTART_STATES = [
  { id: "lapsed", label: "Lapsed" },
  { id: "no-card", label: "Came back without a card" },
  { id: "upload", label: "Plan started · weekly upload" },
];

export const PLAN_CHOICE_STATES = [
  { id: "first", label: "First plan" },
  { id: "had-free-week", label: "Email already had a free week" },
  { id: "no-card", label: "Came back without a card" },
  { id: "stripe-failed", label: "Could not open Stripe" },
];

// Stand-ins for the pages Stripe hosts, so the flow map's paths through Stripe can be clicked.
export const STRIPE_STATES = [
  { id: "checkout-new", label: "Checkout · new student" },
  { id: "checkout-lapsed", label: "Checkout · lapsed student" },
  { id: "checkout-had-free-week", label: "Checkout · no free week" },
  { id: "portal", label: "Customer Portal" },
];

export const PROGRESS_STATES = [
  { id: "lapsed-failed", label: "Lapsed · card failed" },
  { id: "lapsed-ended", label: "Lapsed · plan ended" },
];

export const DELETION_STATES = [
  { id: "has-plan", label: "Has a plan (free week, paid, retrying)" },
  { id: "no-plan", label: "No plan (lapsed)" },
];
