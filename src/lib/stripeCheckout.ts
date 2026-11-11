import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { isAccountId } from "./accountRepository";
import { configuredSiteUrl } from "./email";
import { emailHash } from "./emailHash";
import { PLAN_CHOICE_PATHS, type PlanChoicePlace, type PlanName } from "./planChoice";
import { localDateInTimezone } from "./currentWeeklySchedule";
import { freeWeekEnd, midnightInScheduleTimezone, planChoicePlace, planStatus } from "./planStatus";
import { getPostgresDatabase, type PostgresTransaction } from "./postgres";
import { accounts, billingRecords, usedFreeWeeks } from "./postgresSchema";
import { isoDateInWeek } from "./scheduleReasonText";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";
import { stripeRequest, stripeSecretKey } from "./stripeApi";

export type PlanChoiceStanding =
  | { kind: "admin" | "has_plan" | "no_account" }
  | {
    kind: "choose";
    place: PlanChoicePlace;
    freeWeekEndsAt: Date | null;
    email: string;
    customerId: string | null;
    subscriptionId: string | null;
  };

type Database = ReturnType<typeof getPostgresDatabase> | PostgresTransaction;

export async function planChoiceStanding(accountId: string, realNow: Date, db: Database = getPostgresDatabase()): Promise<PlanChoiceStanding> {
  if (!isAccountId(accountId)) return { kind: "no_account" };
  const [row] = await db
    .select({ role: accounts.role, email: accounts.email, record: billingRecords })
    .from(accounts)
    .leftJoin(billingRecords, eq(billingRecords.accountId, accounts.id))
    .where(eq(accounts.id, accountId));
  if (!row) return { kind: "no_account" };
  const status = planStatus(row.role, row.record, realNow);
  if (status.kind === "admin") return { kind: "admin" };
  const place = planChoicePlace(status);
  if (!place) return { kind: "has_plan" };
  const freeWeekLeft = !row.record && !(await usedFreeWeek(db, row.email));
  return {
    kind: "choose",
    place,
    freeWeekEndsAt: freeWeekLeft ? freeWeekEnd(realNow) : null,
    email: row.email,
    customerId: row.record?.stripeCustomerId ?? null,
    subscriptionId: row.record?.stripeSubscriptionId ?? null,
  };
}

// A row stays until the daily cleanup removes it 12 months on, so any row means the email has used its free week.
async function usedFreeWeek(db: Database, email: string) {
  const [used] = await db.select({ usedOn: usedFreeWeeks.usedOn }).from(usedFreeWeeks)
    .where(eq(usedFreeWeeks.emailHash, emailHash(email)));
  return Boolean(used);
}

const PRICE_SETTING: Record<PlanName, string> = { weekly: "STRIPE_PRICE_WEEKLY", monthly: "STRIPE_PRICE_MONTHLY" };

function priceId(plan: PlanName) {
  const id = process.env[PRICE_SETTING[plan]];
  if (!id || !/^price_\w+$/.test(id)) throw new Error(`${PRICE_SETTING[plan]} is not set.`);
  return id;
}

function returnUrl(place: PlanChoicePlace, params: Record<string, string>) {
  const site = configuredSiteUrl();
  if (!site) throw new Error("SITE_URL is not set, so Stripe Checkout has no address to return to.");
  const url = new URL(PLAN_CHOICE_PATHS[place], site);
  url.search = new URLSearchParams(params).toString();
  return url.toString();
}

const checkoutUrl = z.string().refine((url) => url.startsWith("https://checkout.stripe.com/"), "Not a Stripe Checkout address");
const customerId = z.string().regex(/^cus_\w+$/);
const stripeList = <Item extends z.ZodTypeAny>(item: Item) => z.object({ data: z.array(item) });
const customers = stripeList(z.object({ id: customerId, metadata: z.record(z.string(), z.string()) }));
const subscriptions = stripeList(z.object({ id: z.string(), status: z.string() }));
const openSessions = stripeList(z.object({ id: z.string().regex(/^cs_\w+$/) }));

// Stripe can still be sending the message for one of these, so the billing record does not show it yet.
const STARTED_OR_STARTING = ["trialing", "active", "past_due", "incomplete"];

// Stripe takes an expiry 30 minutes to 24 hours after it creates the session; these leave room for the request.
const MIN_CHECKOUT_MINUTES = 31;
const MAX_CHECKOUT_HOURS = 23;

/** The Account's own Stripe customer, so every Checkout session and subscription of one Account shares it. */
async function accountCustomer(accountId: string, standing: Extract<PlanChoiceStanding, { kind: "choose" }>, secretKey: string) {
  if (standing.customerId) return standing.customerId;
  const query = new URLSearchParams({ email: standing.email, limit: "100" });
  const found = customers.parse(await stripeRequest(`customers?${query}`, secretKey))
    .data.find((customer) => customer.metadata.account_id === accountId);
  if (found) return found.id;
  const form = { email: standing.email, "metadata[account_id]": accountId };
  return z.object({ id: customerId }).parse(await stripeRequest("customers", secretKey, form)).id;
}

/** The session closes at the next Chicago midnight, or 31 minutes on if Stripe's minimum reaches past it, so a late-Sunday Checkout can keep a 7-day free week into Monday. */
function checkoutExpiry(realNow: Date) {
  const nextMidnight = midnightInScheduleTimezone(isoDateInWeek(localDateInTimezone(realNow, SCHEDULE_TIMEZONE), 1));
  const earliest = realNow.getTime() + MIN_CHECKOUT_MINUTES * 60_000;
  const latest = realNow.getTime() + MAX_CHECKOUT_HOURS * 3_600_000;
  return Math.floor(Math.min(Math.max(nextMidnight.getTime(), earliest), latest) / 1000);
}

export type CheckoutStart = { kind: "checkout"; url: string } | { kind: "starting"; place: PlanChoicePlace } | { kind: "refused" };

/**
 * Starts Stripe Checkout for the Account, one at a time: it closes the Account's open Checkout sessions first, and
 * starts none while Stripe holds a subscription that the billing record does not show yet.
 */
export async function startCheckout(accountId: string, plan: PlanName, realNow: Date): Promise<CheckoutStart> {
  return getPostgresDatabase().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`checkout-account:${accountId}`}, 0))`);
    const standing = await planChoiceStanding(accountId, realNow, tx);
    if (standing.kind !== "choose") return { kind: "refused" };
    const secretKey = stripeSecretKey();
    const customer = await accountCustomer(accountId, standing, secretKey);

    const held = subscriptions.parse(await stripeRequest(`subscriptions?customer=${customer}&status=all&limit=100`, secretKey));
    if (held.data.some(({ id, status }) => id !== standing.subscriptionId && STARTED_OR_STARTING.includes(status))) {
      return { kind: "starting", place: standing.place };
    }
    const open = openSessions.parse(await stripeRequest(`checkout/sessions?customer=${customer}&status=open&limit=100`, secretKey));
    for (const session of open.data) {
      await stripeRequest(`checkout/sessions/${session.id}/expire`, secretKey, {});
    }

    const form: Record<string, string> = {
      mode: "subscription",
      customer,
      "line_items[0][price]": priceId(plan),
      "line_items[0][quantity]": "1",
      payment_method_collection: "always",
      client_reference_id: accountId,
      "subscription_data[metadata][account_id]": accountId,
      "managed_payments[enabled]": "true",
      expires_at: String(checkoutExpiry(realNow)),
      success_url: returnUrl(standing.place, { checkout: "done" }),
      cancel_url: returnUrl(standing.place, { checkout: "closed", plan }),
    };
    if (standing.freeWeekEndsAt) form["subscription_data[trial_end]"] = String(Math.floor(standing.freeWeekEndsAt.getTime() / 1000));
    const session = z.object({ url: checkoutUrl }).parse(await stripeRequest("checkout/sessions", secretKey, form));
    return { kind: "checkout", url: session.url };
  });
}
