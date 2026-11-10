import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { isAccountId } from "./accountRepository";
import { getPostgresDatabase } from "./postgres";
import { billingRecords, stripeMessages } from "./postgresSchema";
import type { Subject } from "./securityLog";

export const STRIPE_MESSAGE_ROUTE = "/api/stripe/webhook";

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const STRIPE_API_VERSION = "2025-03-31.basil";

type BillingRow = typeof billingRecords.$inferSelect;

export type StripeMessageRefusal = "badSignature" | "unknownAccount" | "adminAccount" | "otherAccount";

export type StripeMessageOutcome =
  | { kind: "refused"; result: StripeMessageRefusal; who: Subject }
  | { kind: "saved" | "repeat" | "olderSubscription" | "notHandled" };

/** Checks Stripe's `Stripe-Signature` header: an HMAC-SHA256 of `<t>.<raw body>` made with the endpoint's signing secret. */
export function hasStripeSignature(body: Buffer, header: string | null, secret: string, now: Date) {
  if (!header) return false;
  let signedAt: number | undefined;
  const signatures: Buffer[] = [];
  for (const part of header.split(",")) {
    const at = part.indexOf("=");
    const [key, value] = [part.slice(0, at), part.slice(at + 1)];
    if (key === "t" && /^\d{1,12}$/.test(value)) signedAt = Number(value);
    if (key === "v1" && /^[0-9a-f]{64}$/.test(value)) signatures.push(Buffer.from(value, "hex"));
  }
  if (signedAt === undefined || Math.abs(now.getTime() / 1000 - signedAt) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${signedAt}.`).update(body).digest();
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

const subscriptionId = z.string().regex(/^sub_\w+$/);

const messageSchema = z.object({
  id: z.string().regex(/^evt_[A-Za-z0-9]{1,250}$/),
  type: z.string(),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

const invoiceSubscription = z.object({
  parent: z.object({ subscription_details: z.object({ subscription: subscriptionId }) }).nullish(),
  subscription: subscriptionId.nullish(),
});

function subscriptionOf({ type, data: { object } }: z.infer<typeof messageSchema>): string | null {
  const read = (value: unknown) => subscriptionId.safeParse(value).data ?? null;
  if (type === "checkout.session.completed") return read(object.subscription);
  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(type)) {
    return read(object.id);
  }
  if (type === "invoice.paid" || type === "invoice.payment_failed") {
    const invoice = invoiceSubscription.safeParse(object).data;
    return invoice?.parent?.subscription_details.subscription ?? invoice?.subscription ?? null;
  }
  // The Customer Portal makes a switch to a shorter plan wait for renewal with a subscription schedule.
  if (type.startsWith("subscription_schedule.")) return read(object.subscription);
  return null;
}

const seconds = z.number().int().transform((value) => new Date(value * 1000));

const subscriptionSchema = z.object({
  id: subscriptionId,
  customer: z.string().regex(/^cus_\w+$/),
  status: z.enum(["trialing", "active", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"]),
  created: z.number().int(),
  metadata: z.record(z.string(), z.string()),
  trial_end: seconds.nullable(),
  ended_at: seconds.nullable(),
  items: z.object({
    data: z.array(z.object({
      current_period_start: seconds,
      current_period_end: seconds,
      price: z.object({ recurring: z.object({ interval: z.string(), interval_count: z.number() }).nullable() }),
    })).min(1),
  }),
  latest_invoice: z.object({
    created: seconds,
    status_transitions: z.object({ finalized_at: seconds.nullable() }),
  }).nullable(),
});
type Subscription = z.infer<typeof subscriptionSchema>;

const paidInvoicesSchema = z.object({ data: z.array(z.object({ amount_paid: z.number() })) });

class StripeRequestFailed extends Error {
  override name = "StripeRequestFailed";
}

function stripeSettings() {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!signingSecret || !secretKey) throw new Error("STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY is not set.");
  return { signingSecret, secretKey };
}

async function stripeGet(path: string, secretKey: string) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { authorization: `Bearer ${secretKey}`, "stripe-version": STRIPE_API_VERSION },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new StripeRequestFailed(`Stripe answered ${response.status}`);
  return response.json();
}

const fetchSubscription = async (id: string, secretKey: string) =>
  subscriptionSchema.parse(await stripeGet(`subscriptions/${id}?expand[]=latest_invoice`, secretKey));

async function hasPaidCharge(id: string, secretKey: string) {
  const invoices = paidInvoicesSchema.parse(await stripeGet(`invoices?subscription=${id}&status=paid&limit=100`, secretKey));
  return invoices.data.some((invoice) => invoice.amount_paid > 0);
}

function planOf(subscription: Subscription): BillingRow["plan"] {
  const recurring = subscription.items.data[0].price.recurring;
  if (recurring?.interval_count === 1 && recurring.interval === "week") return "weekly";
  if (recurring?.interval_count === 1 && recurring.interval === "month") return "monthly";
  throw new Error("The subscription's price is not Weekly or Monthly.");
}

const earlier = (a: Date | null, b: Date | null) => (a && b ? (a < b ? a : b) : a ?? b);

const isNewer = (a: Subscription, b: Subscription) => a.created > b.created || (a.created === b.created && a.id > b.id);

const NEVER_PAID_FOR_THIS_PERIOD: readonly Subscription["status"][] = ["unpaid", "paused", "incomplete", "incomplete_expired"];

function paidPeriodEnd(subscription: Subscription) {
  const period = subscription.items.data[0];
  if (NEVER_PAID_FOR_THIS_PERIOD.includes(subscription.status)) return period.current_period_start;
  return subscription.ended_at ?? period.current_period_end;
}

async function billingState(subscription: Subscription, current: BillingRow | undefined, secretKey: string) {
  const sameSubscription = current?.stripeSubscriptionId === subscription.id;
  const firstChargeSucceeded = (sameSubscription && current.firstChargeSucceeded) || await hasPaidCharge(subscription.id, secretKey);
  const invoice = subscription.latest_invoice;
  const failedAt = invoice ? invoice.status_transitions.finalized_at ?? invoice.created : null;
  const keptFailedAt = sameSubscription ? current.renewalFailedAt : null;
  const renewalFailing = firstChargeSucceeded && subscription.status === "past_due";
  return {
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    plan: planOf(subscription),
    stripeStatus: subscription.status,
    freeWeekEndsAt: subscription.trial_end,
    paidPeriodEndsAt: paidPeriodEnd(subscription),
    firstChargeSucceeded,
    renewalFailedAt: renewalFailing ? earlier(keptFailedAt, failedAt) : null,
  };
}

/**
 * Handles one Stripe message. The message only names a subscription: its state is fetched from Stripe and saved,
 * so a repeated or reordered message leaves the same billing record. Checkout must put the Account ID in the
 * subscription's `metadata.account_id` and reuse the Account's Stripe customer.
 */
export async function receiveStripeMessage(body: Buffer, signature: string | null, now: Date): Promise<StripeMessageOutcome> {
  const { signingSecret, secretKey } = stripeSettings();
  if (!hasStripeSignature(body, signature, signingSecret, now)) return { kind: "refused", result: "badSignature", who: { nobody: true } };
  const message = messageSchema.parse(JSON.parse(body.toString("utf8")));
  const id = subscriptionOf(message);
  if (!id) return { kind: "notHandled" };

  return getPostgresDatabase().transaction(async (tx) => {
    const [fresh] = await tx.insert(stripeMessages).values({ id: message.id }).onConflictDoNothing().returning({ id: stripeMessages.id });
    if (!fresh) return { kind: "repeat" };

    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`stripe-subscription:${id}`}, 0))`);
    const subscription = await fetchSubscription(id, secretKey);
    const accountId = subscription.metadata.account_id;
    if (!isAccountId(accountId)) return { kind: "refused", result: "unknownAccount", who: { nobody: true } };
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`billing-account:${accountId}`}, 0))`);
    const [account] = (await tx.execute<{ role: string }>(sql`select role from accounts where id = ${accountId}`)).rows;
    if (!account) return { kind: "refused", result: "unknownAccount", who: { nobody: true } };
    const who = { account: accountId };
    if (account.role === "admin") return { kind: "refused", result: "adminAccount", who };

    const [elsewhere] = await tx.select({ accountId: billingRecords.accountId }).from(billingRecords).where(and(
      ne(billingRecords.accountId, accountId),
      or(eq(billingRecords.stripeCustomerId, subscription.customer), eq(billingRecords.stripeSubscriptionId, subscription.id)),
    ));
    const [current] = await tx.select().from(billingRecords).where(eq(billingRecords.accountId, accountId));
    const sameSubscription = current?.stripeSubscriptionId === subscription.id;
    if (elsewhere || (current && current.stripeCustomerId !== subscription.customer)) {
      return { kind: "refused", result: "otherAccount", who };
    }
    if (current && !sameSubscription && !isNewer(subscription, await fetchSubscription(current.stripeSubscriptionId, secretKey))) {
      return { kind: "olderSubscription" };
    }

    const state = await billingState(subscription, current, secretKey);
    await tx.insert(billingRecords).values({ accountId, ...state })
      .onConflictDoUpdate({ target: billingRecords.accountId, set: state });
    return { kind: "saved" };
  });
}
