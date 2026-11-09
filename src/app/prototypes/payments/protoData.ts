import { planPriceText, type PlanPrices } from "@/lib/planPrices";

export type PlanName = "weekly" | "monthly";

export type ProtoData = {
  prices: PlanPrices;
  freeWeek: { endsShort: string; endsLong: string; firstChargeShort: string };
};

export const DATASETS = {
  demo: {
    prices: { weeklyCents: 1000, monthlyCents: 2999 },
    freeWeek: { endsShort: "Sun, Nov 22", endsLong: "Sunday, Nov 22", firstChargeShort: "Mon, Nov 23" },
  },
  // Onboarding finished Mon, Dec 21: the longest free week (13 days), across the new year, with a price rise to $14.99 and $49.99.
  worst: {
    prices: { weeklyCents: 1499, monthlyCents: 4999 },
    freeWeek: { endsShort: "Sun, Jan 3", endsLong: "Sunday, Jan 3", firstChargeShort: "Mon, Jan 4" },
  },
  // Monthly costs more than 4⅓ weeks of Weekly, so there is no saving to show.
  "no-saving": {
    prices: { weeklyCents: 1000, monthlyCents: 4500 },
    freeWeek: { endsShort: "Sun, Nov 22", endsLong: "Sunday, Nov 22", firstChargeShort: "Mon, Nov 23" },
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
