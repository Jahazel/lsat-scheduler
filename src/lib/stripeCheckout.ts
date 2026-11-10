import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { isAccountId } from "./accountRepository";
import { configuredSiteUrl } from "./email";
import { emailHash } from "./emailHash";
import type { PlanName } from "./planChoice";
import { freeWeekEnd, planStatus } from "./planStatus";
import { getPostgresDatabase } from "./postgres";
import { accounts, billingRecords, usedFreeWeeks } from "./postgresSchema";
import { stripeRequest, stripeSecretKey } from "./stripeApi";

export type PlanChoiceStanding =
  | { kind: "admin" | "has_plan" | "no_account" }
  | { kind: "choose"; freeWeekEndsAt: Date | null; email: string; customerId: string | null };

const PLAN_CHOICE_PATH = "/onboarding";

export async function planChoiceStanding(accountId: string, realNow: Date): Promise<PlanChoiceStanding> {
  if (!isAccountId(accountId)) return { kind: "no_account" };
  const db = getPostgresDatabase();
  const [row] = await db
    .select({ role: accounts.role, email: accounts.email, record: billingRecords })
    .from(accounts)
    .leftJoin(billingRecords, eq(billingRecords.accountId, accounts.id))
    .where(eq(accounts.id, accountId));
  if (!row) return { kind: "no_account" };
  const status = planStatus(row.role, row.record, realNow);
  if (status.kind === "admin") return { kind: "admin" };
  if (status.kind !== "no_plan" && status.kind !== "lapsed") return { kind: "has_plan" };
  const freeWeekLeft = !row.record && !(await usedFreeWeekWithinAYear(row.email));
  return {
    kind: "choose",
    freeWeekEndsAt: freeWeekLeft ? freeWeekEnd(realNow) : null,
    email: row.email,
    customerId: row.record?.stripeCustomerId ?? null,
  };
}

async function usedFreeWeekWithinAYear(email: string) {
  const [used] = await getPostgresDatabase().select({ usedOn: usedFreeWeeks.usedOn }).from(usedFreeWeeks).where(and(
    eq(usedFreeWeeks.emailHash, emailHash(email)),
    gte(usedFreeWeeks.usedOn, sql`current_date - interval '12 months'`),
  ));
  return Boolean(used);
}

const PRICE_SETTING: Record<PlanName, string> = { weekly: "STRIPE_WEEKLY_PRICE_ID", monthly: "STRIPE_MONTHLY_PRICE_ID" };

function priceId(plan: PlanName) {
  const id = process.env[PRICE_SETTING[plan]];
  if (!id || !/^price_\w+$/.test(id)) throw new Error(`${PRICE_SETTING[plan]} is not set.`);
  return id;
}

function returnUrl(params: Record<string, string>) {
  const site = configuredSiteUrl();
  if (!site) throw new Error("SITE_URL is not set, so Stripe Checkout has no address to return to.");
  const url = new URL(PLAN_CHOICE_PATH, site);
  url.search = new URLSearchParams(params).toString();
  return url.toString();
}

const checkoutSessionSchema = z.object({
  url: z.string().refine((url) => url.startsWith("https://checkout.stripe.com/"), "Not a Stripe Checkout address"),
});

const IDEMPOTENCY_WINDOW_MS = 60_000;

const sameKeyForRequestsInOneMinute = (accountId: string, plan: PlanName, trialEnd: number | null, realNow: Date) =>
  `checkout-${accountId}-${plan}-${trialEnd ?? "now"}-${Math.floor(realNow.getTime() / IDEMPOTENCY_WINDOW_MS)}`;

export async function createCheckoutSession(
  accountId: string,
  standing: Extract<PlanChoiceStanding, { kind: "choose" }>,
  plan: PlanName,
  realNow: Date,
) {
  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId(plan),
    "line_items[0][quantity]": "1",
    payment_method_collection: "always",
    client_reference_id: accountId,
    "subscription_data[metadata][account_id]": accountId,
    "managed_payments[enabled]": "true",
    success_url: returnUrl({ checkout: "done" }),
    cancel_url: returnUrl({ checkout: "closed", plan }),
  });
  if (standing.customerId) form.set("customer", standing.customerId);
  else form.set("customer_email", standing.email);
  const trialEnd = standing.freeWeekEndsAt && Math.floor(standing.freeWeekEndsAt.getTime() / 1000);
  if (trialEnd) form.set("subscription_data[trial_end]", String(trialEnd));

  const session = checkoutSessionSchema.parse(await stripeRequest("checkout/sessions", {
    secretKey: stripeSecretKey(),
    form,
    idempotencyKey: sameKeyForRequestsInOneMinute(accountId, plan, trialEnd, realNow),
  }));
  return session.url;
}
