import { planPriceText } from "@/lib/planPrices";

export const PROTO_PRICES = planPriceText({ weeklyCents: 1000, monthlyCents: 2999 });

export type PlanName = "weekly" | "monthly";

export const PLANS: Record<PlanName, { name: string; price: string; per: string; every: string; renewsLine: string; tag?: string }> = {
  weekly: {
    name: "Weekly",
    price: PROTO_PRICES.weekly,
    per: "a week",
    every: "each week",
    renewsLine: "Then every Monday",
  },
  monthly: {
    name: "Monthly",
    price: PROTO_PRICES.monthly,
    per: "a month",
    every: "each month",
    renewsLine: "Then on the 23rd of each month",
    tag: PROTO_PRICES.monthlySaving,
  },
};

export const FREE_WEEK = {
  today: "Wed, Nov 11",
  endsShort: "Sun, Nov 22",
  endsLong: "Sunday, Nov 22",
  firstChargeShort: "Mon, Nov 23",
  firstChargeLong: "Monday, Nov 23",
};

export const TERMS = "Cancel anytime. You keep access until your paid week or month ends. No refunds for unused time.";

export const agreementLine = (plan: PlanName) => `By continuing, you agree your plan renews ${PLANS[plan].every} until you cancel.`;

export const STRIPE_NOTE = "You add your card on Stripe, then come back here.";
