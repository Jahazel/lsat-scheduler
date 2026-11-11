import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, ne, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { isAccountId } from "./accountRepository";
import { emailHash } from "./emailHash";
import { getPostgresDatabase, type PostgresTransaction } from "./postgres";
import { billingRecords, stripeMessages, usedFreeWeeks } from "./postgresSchema";
import type { Subject } from "./securityLog";
import { stripeRequest, stripeSecretKey } from "./stripeApi";

export const STRIPE_MESSAGE_ROUTE = "/api/stripe/webhook";

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

type BillingRow = typeof billingRecords.$inferSelect;
type Database = ReturnType<typeof getPostgresDatabase>;

export type StripeMessageRefusal = "badSignature" | "unknownAccount" | "deletedAccountPlanEnded" | "adminAccount" | "otherAccount";

type SaveSource = "message" | "restore";

type SaveOutcome =
  | { kind: "refused"; result: StripeMessageRefusal; who: Subject }
  | { kind: "saved" | "olderSubscription" };

export type StripeMessageOutcome = SaveOutcome | { kind: "repeat" | "notHandled" };

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
  cancel_at: seconds.nullable(),
  cancel_at_period_end: z.boolean(),
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

function stripeSettings() {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  return { signingSecret, secretKey: stripeSecretKey() };
}

const fetchSubscription = async (id: string, secretKey: string) =>
  subscriptionSchema.parse(await stripeRequest(`subscriptions/${id}?expand[]=latest_invoice`, secretKey));

async function hasPaidCharge(id: string, secretKey: string) {
  const invoices = paidInvoicesSchema.parse(await stripeRequest(`invoices?subscription=${id}&status=paid&limit=100`, secretKey));
  return invoices.data.some((invoice) => invoice.amount_paid > 0);
}

class UnknownPrice extends Error {
  override name = "UnknownPrice";
}

function planOf(subscription: Subscription): BillingRow["plan"] {
  const recurring = subscription.items.data[0].price.recurring;
  if (recurring?.interval_count === 1 && recurring.interval === "week") return "weekly";
  if (recurring?.interval_count === 1 && recurring.interval === "month") return "monthly";
  throw new UnknownPrice("The subscription's price is not Weekly or Monthly.");
}

const earlier = (a: Date | null, b: Date | null) => (a && b ? (a < b ? a : b) : a ?? b);

const isNewer = (a: Subscription, b: Subscription) => a.created > b.created || (a.created === b.created && a.id > b.id);

const NEVER_PAID_FOR_THIS_PERIOD: readonly Subscription["status"][] = ["unpaid", "paused", "incomplete", "incomplete_expired"];

function paidPeriodEnd(subscription: Subscription) {
  const period = subscription.items.data[0];
  if (NEVER_PAID_FOR_THIS_PERIOD.includes(subscription.status)) return period.current_period_start;
  return subscription.ended_at ?? period.current_period_end;
}

/** A restored record's failure date can predate a recovery the restore lost, so only the message path keeps it. */
async function billingState(subscription: Subscription, current: BillingRow | undefined, secretKey: string, from: SaveSource) {
  const sameSubscription = current?.stripeSubscriptionId === subscription.id;
  const firstChargeSucceeded = (sameSubscription && current.firstChargeSucceeded) || await hasPaidCharge(subscription.id, secretKey);
  const invoice = subscription.latest_invoice;
  const failedAt = invoice ? invoice.status_transitions.finalized_at ?? invoice.created : null;
  const keptFailedAt = sameSubscription && from === "message" ? current.renewalFailedAt : null;
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
    cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancel_at !== null,
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
    return saveSubscription(tx, id, secretKey, "message");
  });
}

async function saveSubscription(tx: PostgresTransaction, id: string, secretKey: string, from: SaveSource): Promise<SaveOutcome> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`stripe-subscription:${id}`}, 0))`);
  const subscription = await fetchSubscription(id, secretKey);
  const accountId = subscription.metadata.account_id;
  if (!isAccountId(accountId)) return { kind: "refused", result: "unknownAccount", who: { nobody: true } };
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`billing-account:${accountId}`}, 0))`);
  const [account] = (await tx.execute<{ role: string; email: string }>(
    sql`select role, email from accounts where id = ${accountId} for key share`,
  )).rows;
  if (!account) {
    return from === "message" ? endPlanOfDeletedAccount(tx, subscription, accountId, secretKey) : { kind: "refused", result: "unknownAccount", who: { nobody: true } };
  }
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

  const state = await billingState(subscription, current, secretKey, from);
  await tx.insert(billingRecords).values({ accountId, ...state })
    .onConflictDoUpdate({ target: billingRecords.accountId, set: state });
  if (from === "message" && state.stripeStatus === "trialing") await tx.insert(usedFreeWeeks).values({ emailHash: emailHash(account.email) }).onConflictDoNothing();
  return { kind: "saved" };
}

const ENDED: readonly Subscription["status"][] = ["canceled", "incomplete_expired"];

async function endPlanOfDeletedAccount(
  tx: PostgresTransaction, subscription: Subscription, accountId: string, secretKey: string,
): Promise<SaveOutcome> {
  const [{ listed }] = (await tx.execute<{ listed: boolean }>(sql`select is_on_deletion_list(${accountId}) as listed`)).rows;
  if (!listed || ENDED.includes(subscription.status)) return { kind: "refused", result: "unknownAccount", who: { nobody: true } };
  await stripeRequest(`subscriptions/${subscription.id}`, secretKey, undefined, "DELETE");
  return { kind: "refused", result: "deletedAccountPlanEnded", who: { nobody: true } };
}

const subscriptionPageSchema = z.object({ data: z.array(z.object({ id: subscriptionId })), has_more: z.boolean() });

async function listSubscriptionIds(secretKey: string) {
  const ids: string[] = [];
  for (let hasMore = true; hasMore;) {
    const after = ids.length ? `&starting_after=${ids[ids.length - 1]}` : "";
    const page = subscriptionPageSchema.parse(await stripeRequest(`subscriptions?status=all&limit=100${after}`, secretKey));
    ids.push(...page.data.map((listed) => listed.id));
    hasMore = page.has_more && page.data.length > 0;
  }
  return ids;
}

type BillingResyncCounts = {
  listed: number;
  saved: number;
  /** Deleted, admin, or other Accounts' subscriptions, and older subscriptions of an Account with a newer one. */
  leftOut: number;
  unknownPrice: string[];
  /** Billing records whose subscription Stripe does not list, such as records from the other Stripe mode. */
  notInStripe: number;
};

/** After a backup restore, saves every Stripe subscription again with the message receiver's own save, one transaction each. */
export async function resyncBillingRecords(db: Database, secretKey: string): Promise<BillingResyncCounts> {
  const ids = await listSubscriptionIds(secretKey);
  let saved = 0;
  const unknownPrice: string[] = [];
  for (const id of ids) {
    try {
      const outcome = await db.transaction((tx) => saveSubscription(tx, id, secretKey, "restore"));
      if (outcome.kind === "saved") saved += 1;
    } catch (error) {
      if (!(error instanceof UnknownPrice)) throw error;
      unknownPrice.push(id);
    }
  }
  const unlisted = await db.select({ id: billingRecords.accountId }).from(billingRecords)
    .where(notInArray(billingRecords.stripeSubscriptionId, ids));
  return { listed: ids.length, saved, leftOut: ids.length - saved - unknownPrice.length, unknownPrice, notInStripe: unlisted.length };
}

export function billingResyncReport(counts: BillingResyncCounts) {
  const skipped = counts.unknownPrice.length ? ` (${counts.unknownPrice.join(", ")})` : "";
  return `Stripe subscriptions: ${counts.listed}. Billing records saved: ${counts.saved}. Left out: ${counts.leftOut}. `
    + `Skipped for a price that is not Weekly or Monthly: ${counts.unknownPrice.length}${skipped}. `
    + `Billing records Stripe does not list: ${counts.notInStripe}.\n`;
}
