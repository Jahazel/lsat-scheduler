import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/stripe/webhook/route";
import { setUpAppTestDatabase } from "./appTestDatabase";

const SECRET = "whsec_test_receiver_secret";
const OTHER_SITE_SECRET = "whsec_test_other_site_secret";
const KEY = "sk_test_receiver_key";
const FREE_WEEK_END = 1_794_000_000;
const PERIOD_END = FREE_WEEK_END + 7 * 86_400;

type FakeSubscription = {
  id: string; customer: string; status: string; created: number; metadata: Record<string, string>;
  trial_end: number | null; ended_at: number | null; schedule: string | null;
  items: { data: { current_period_start?: number; current_period_end: number; price: { recurring: { interval: string; interval_count: number } } }[] };
  latest_invoice: { created: number; status_transitions: { finalized_at: number | null } } | null;
};

const stripe = {
  subscriptions: new Map<string, FakeSubscription>(),
  paidInvoices: new Map<string, number[]>(),
  requests: [] as string[],
  down: false,
  /** When set, the next subscription read answers with the state it saw, after this promise settles. */
  hold: null as Promise<void> | null,
};

vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  stripe.requests.push(`${url.pathname}${url.search}`);
  const headers = new Headers(init?.headers);
  if (url.origin !== "https://api.stripe.com" || headers.get("authorization") !== `Bearer ${KEY}`) throw new Error("Not Stripe");
  if (stripe.down) return Response.json({ error: { type: "api_error" } }, { status: 500 });
  const subscription = /^\/v1\/subscriptions\/(sub_\w+)$/.exec(url.pathname);
  if (subscription) {
    const found = stripe.subscriptions.get(subscription[1]);
    if (!found) return Response.json({ error: { type: "invalid_request_error" } }, { status: 404 });
    const items = found.items.data.map((item) => ({ current_period_start: item.current_period_end - 7 * 86_400, ...item }));
    const answer = Response.json({ ...found, items: { data: items } });
    const hold = stripe.hold;
    stripe.hold = null;
    await hold;
    return answer;
  }
  if (url.pathname === "/v1/invoices" && url.searchParams.get("status") === "paid") {
    const amounts = stripe.paidInvoices.get(url.searchParams.get("subscription") ?? "") ?? [];
    return Response.json({ data: amounts.map((amount_paid) => ({ amount_paid })) });
  }
  return Response.json({ error: { type: "invalid_request_error" } }, { status: 404 });
});

const database = setUpAppTestDatabase();
let accountId: string;
let messageNumber = 0;

beforeEach(async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("STRIPE_SECRET_KEY", KEY);
  stripe.subscriptions.clear();
  stripe.paidInvoices.clear();
  stripe.requests = [];
  stripe.down = false;
  stripe.hold = null;
  await database.owner.execute(sql`truncate accounts, security_log, stripe_messages cascade`);
  const account = await database.createAccountAsOwner({ email: "maya@example.test", name: "Maya" });
  if (!account) throw new Error("Account fixture already exists");
  accountId = account.id;
});
afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function subscription(id: string, owner: string, changes: Partial<FakeSubscription> = {}): FakeSubscription {
  return {
    id, customer: `cus_${id.slice(4)}`, status: "trialing", created: 1_793_400_000, metadata: { account_id: owner },
    trial_end: FREE_WEEK_END, ended_at: null, schedule: null,
    items: { data: [{ current_period_end: FREE_WEEK_END, price: { recurring: { interval: "week", interval_count: 1 } } }] },
    latest_invoice: { created: 1_793_400_000, status_transitions: { finalized_at: 1_793_400_000 } },
    ...changes,
  };
}

const monthly = { recurring: { interval: "month", interval_count: 1 } };

function message(type: string, object: Record<string, unknown>, id = `evt_test${++messageNumber}`) {
  return JSON.stringify({ id, object: "event", type, data: { object } });
}
const checkoutCompleted = (sub: string) => message("checkout.session.completed", { id: "cs_test_1", mode: "subscription", subscription: sub });
const subscriptionChanged = (sub: string, change: "created" | "updated" | "deleted") => message(`customer.subscription.${change}`, { id: sub });
const invoice = (sub: string, paid: boolean) => message(paid ? "invoice.paid" : "invoice.payment_failed", {
  id: "in_test_1", parent: { type: "subscription_details", subscription_details: { subscription: sub } },
});

function signature(body: string, { secret = SECRET, at = Math.floor(Date.now() / 1000) } = {}) {
  return `t=${at},v1=${createHmac("sha256", secret).update(`${at}.${body}`).digest("hex")}`;
}

function send(body: string, stripeSignature: string | null = signature(body)) {
  return POST(new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST", body, headers: stripeSignature === null ? {} : { "stripe-signature": stripeSignature },
  }));
}

const timestamp = (value: string | null) => (value === null ? null : new Date(value));
const records = async () => (await database.owner.execute<Record<string, string | boolean | null> & {
  free_week_ends_at: string | null; paid_period_ends_at: string | null; renewal_failed_at: string | null;
}>(sql`
  select account_id, stripe_customer_id, stripe_subscription_id, plan, stripe_status, free_week_ends_at, paid_period_ends_at,
    first_charge_succeeded, renewal_failed_at
  from billing_records order by account_id
`)).rows.map((row) => ({
  ...row,
  free_week_ends_at: timestamp(row.free_week_ends_at),
  paid_period_ends_at: timestamp(row.paid_period_ends_at),
  renewal_failed_at: timestamp(row.renewal_failed_at),
}));
const refusals = async () => (await database.owner.execute(sql`
  select result, route, account_id from security_log where event = 'stripe_message_refused' order by logged_at
`)).rows;
const handledMessages = async () => (await database.owner.execute(sql`select id from stripe_messages order by id`)).rows;

it("refuses a forged, changed, or stale message with 400, changing nothing and logging each one", async () => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));
  const body = checkoutCompleted("sub_maya");
  const forged = [
    null,
    "",
    "t=1793400000,v1=0000000000000000000000000000000000000000000000000000000000000000",
    signature(body, { secret: OTHER_SITE_SECRET }),
    signature(body.replace("sub_maya", "sub_mayb")),
    signature(body, { at: Math.floor(Date.now() / 1000) - 301 }),
    signature(body).replace("v1=", "v0="),
  ];
  for (const stripeSignature of forged) {
    const response = await send(body, stripeSignature);
    expect(response.status).toBe(400);
  }

  expect(await records()).toEqual([]);
  expect(await handledMessages()).toEqual([]);
  expect(stripe.requests).toEqual([]);
  expect(await refusals()).toEqual(forged.map(() => ({ result: "badSignature", route: "/api/stripe/webhook", account_id: null })));
});

it("saves the subscription Stripe returns when checkout completes, not the message's contents", async () => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));
  stripe.paidInvoices.set("sub_maya", [0]);

  const response = await send(message("checkout.session.completed", {
    id: "cs_test_1", mode: "subscription", subscription: "sub_maya", status: "active", metadata: { plan: "monthly" },
  }));

  expect(response.status).toBe(200);
  expect(await records()).toEqual([{
    account_id: accountId, stripe_customer_id: "cus_maya", stripe_subscription_id: "sub_maya", plan: "weekly",
    stripe_status: "trialing", free_week_ends_at: new Date(FREE_WEEK_END * 1000), paid_period_ends_at: new Date(FREE_WEEK_END * 1000),
    first_charge_succeeded: false, renewal_failed_at: null,
  }]);
  expect(await refusals()).toEqual([]);
});

it.each([
  ["subscription created", () => subscriptionChanged("sub_maya", "created")],
  ["subscription updated", () => subscriptionChanged("sub_maya", "updated")],
  ["subscription deleted", () => subscriptionChanged("sub_maya", "deleted")],
  ["invoice paid", () => invoice("sub_maya", true)],
  ["invoice payment failed", () => invoice("sub_maya", false)],
  ["an invoice in an older Stripe version", () => message("invoice.paid", { id: "in_test_1", subscription: "sub_maya" })],
  ["subscription schedule updated", () => message("subscription_schedule.updated", { id: "sub_sched_1", subscription: "sub_maya" })],
])("handles %s by saving the subscription's current state", async (_name, body) => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, { status: "active", trial_end: null,
    items: { data: [{ current_period_end: PERIOD_END, price: monthly }] } }));
  stripe.paidInvoices.set("sub_maya", [2999]);

  expect((await send(body())).status).toBe(200);

  expect(await records()).toEqual([expect.objectContaining({
    plan: "monthly", stripe_status: "active", free_week_ends_at: null, paid_period_ends_at: new Date(PERIOD_END * 1000),
    first_charge_succeeded: true,
  })]);
});

it("answers 200 to a message it does not handle, saving nothing", async () => {
  const response = await send(message("customer.updated", { id: "cus_maya" }));
  expect(response.status).toBe(200);
  expect(await handledMessages()).toEqual([]);
  expect(stripe.requests).toEqual([]);
});

it("does nothing for a repeated message, even when Stripe's state changed since", async () => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));
  const body = checkoutCompleted("sub_maya");
  await send(body);
  const first = await records();
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, { status: "canceled" }));
  stripe.requests = [];

  expect((await send(body)).status).toBe(200);

  expect(await records()).toEqual(first);
  expect(stripe.requests).toEqual([]);
});

it("handles two copies of one message sent at the same time once", async () => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));
  const body = checkoutCompleted("sub_maya");

  const responses = await Promise.all([send(body), send(body)]);

  expect(responses.map((response) => response.status)).toEqual([200, 200]);
  expect(stripe.requests.filter((request) => request.startsWith("/v1/subscriptions/"))).toHaveLength(1);
  expect(await records()).toEqual([expect.objectContaining({ stripe_status: "trialing" })]);
});

it("ends in the same state when the free week's messages arrive in reverse order", async () => {
  const lifecycle = () => [
    checkoutCompleted("sub_maya"), subscriptionChanged("sub_maya", "created"), invoice("sub_maya", true),
    subscriptionChanged("sub_maya", "updated"), invoice("sub_maya", true),
  ];
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, {
    status: "active", items: { data: [{ current_period_end: PERIOD_END, price: { recurring: { interval: "week", interval_count: 1 } } }] },
  }));
  stripe.paidInvoices.set("sub_maya", [0, 1000]);

  for (const body of lifecycle()) await send(body);
  const inOrder = await records();
  await database.owner.execute(sql`truncate billing_records, stripe_messages`);
  for (const body of lifecycle().reverse()) await send(body);

  expect(await records()).toEqual(inOrder);
  expect(inOrder).toEqual([expect.objectContaining({
    stripe_status: "active", free_week_ends_at: new Date(FREE_WEEK_END * 1000), first_charge_succeeded: true,
  })]);
});

it("marks the first charge only when a paid invoice charged money", async () => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));
  stripe.paidInvoices.set("sub_maya", [0]);
  await send(invoice("sub_maya", true));
  expect(await records()).toEqual([expect.objectContaining({ first_charge_succeeded: false })]);

  stripe.paidInvoices.set("sub_maya", [0, 1000]);
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, { status: "active" }));
  await send(invoice("sub_maya", true));
  expect(await records()).toEqual([expect.objectContaining({ first_charge_succeeded: true, stripe_status: "active" })]);

  stripe.paidInvoices.set("sub_maya", []);
  await send(subscriptionChanged("sub_maya", "updated"));
  expect(await records()).toEqual([expect.objectContaining({ first_charge_succeeded: true })]);
});

it("saves past_due with the time the renewal first failed, and keeps that time through Stripe's retries", async () => {
  const failedAt = PERIOD_END + 3600;
  stripe.paidInvoices.set("sub_maya", [0, 1000]);
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, {
    status: "past_due", latest_invoice: { created: PERIOD_END, status_transitions: { finalized_at: failedAt } },
  }));
  await send(invoice("sub_maya", false));
  expect(await records()).toEqual([expect.objectContaining({
    stripe_status: "past_due", renewal_failed_at: new Date(failedAt * 1000),
  })]);

  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, {
    status: "past_due", latest_invoice: { created: PERIOD_END + 86_400, status_transitions: { finalized_at: PERIOD_END + 86_400 } },
  }));
  await send(invoice("sub_maya", false));
  expect(await records()).toEqual([expect.objectContaining({ renewal_failed_at: new Date(failedAt * 1000) })]);

  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, { status: "active" }));
  await send(invoice("sub_maya", true));
  expect(await records()).toEqual([expect.objectContaining({ stripe_status: "active", renewal_failed_at: null })]);
});

it("saves no renewal failure when the first charge failed", async () => {
  stripe.paidInvoices.set("sub_maya", [0]);
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, { status: "past_due" }));
  await send(invoice("sub_maya", false));
  expect(await records()).toEqual([expect.objectContaining({
    stripe_status: "past_due", first_charge_succeeded: false, renewal_failed_at: null,
  })]);
});

it("keeps the current plan while a switch to Weekly waits in a subscription schedule, and saves Weekly at renewal", async () => {
  stripe.paidInvoices.set("sub_maya", [2999]);
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, {
    status: "active", trial_end: null, schedule: "sub_sched_1", items: { data: [{ current_period_end: PERIOD_END, price: monthly }] },
  }));
  await send(message("subscription_schedule.created", { id: "sub_sched_1", subscription: "sub_maya" }));
  expect(await records()).toEqual([expect.objectContaining({ plan: "monthly" })]);

  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, {
    status: "active", trial_end: null, schedule: null,
    items: { data: [{ current_period_end: PERIOD_END + 7 * 86_400, price: { recurring: { interval: "week", interval_count: 1 } } }] },
  }));
  await send(subscriptionChanged("sub_maya", "updated"));
  expect(await records()).toEqual([expect.objectContaining({ plan: "weekly", paid_period_ends_at: new Date((PERIOD_END + 7 * 86_400) * 1000) })]);
});

it("saves a cancelled plan's end so access lasts until the paid period ends", async () => {
  const endedAt = PERIOD_END - 86_400;
  stripe.paidInvoices.set("sub_maya", [1000]);
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, {
    status: "canceled", ended_at: endedAt, items: { data: [{ current_period_end: PERIOD_END, price: monthly }] },
  }));
  await send(subscriptionChanged("sub_maya", "deleted"));
  expect(await records()).toEqual([expect.objectContaining({ stripe_status: "canceled", paid_period_ends_at: new Date(endedAt * 1000) })]);
});

it("replaces a lapsed plan with a newer one, and ignores later messages about the older one", async () => {
  stripe.paidInvoices.set("sub_old", [1000]);
  stripe.paidInvoices.set("sub_new", [1000]);
  stripe.subscriptions.set("sub_old", subscription("sub_old", accountId, { status: "past_due", created: 1_793_400_000 }));
  stripe.subscriptions.set("sub_new", subscription("sub_new", accountId, {
    customer: "cus_old", status: "active", trial_end: null, created: 1_795_000_000,
  }));
  await send(subscriptionChanged("sub_old", "updated"));
  await send(checkoutCompleted("sub_new"));
  expect(await records()).toEqual([expect.objectContaining({ stripe_subscription_id: "sub_new", stripe_status: "active" })]);

  stripe.subscriptions.set("sub_old", subscription("sub_old", accountId, { status: "canceled", created: 1_793_400_000 }));
  expect((await send(subscriptionChanged("sub_old", "deleted"))).status).toBe(200);
  expect(await records()).toEqual([expect.objectContaining({ stripe_subscription_id: "sub_new", stripe_status: "active" })]);
  expect(await refusals()).toEqual([]);
});

it.each([
  ["no Account ID", {}],
  ["a malformed Account ID", { account_id: "not-a-uuid" }],
  ["an Account that does not exist", { account_id: "00000000-0000-4000-8000-000000000685" }],
])("ignores a message for %s and logs it", async (_name, metadata) => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, { metadata }));
  expect((await send(checkoutCompleted("sub_maya"))).status).toBe(200);
  expect(await records()).toEqual([]);
  expect(await refusals()).toEqual([{ result: "unknownAccount", route: "/api/stripe/webhook", account_id: null }]);
});

it("ignores a message for a deleted Account and logs it", async () => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));
  await database.owner.execute(sql`delete from accounts where id = ${accountId}`);
  expect((await send(checkoutCompleted("sub_maya"))).status).toBe(200);
  expect(await records()).toEqual([]);
  expect(await refusals()).toEqual([expect.objectContaining({ result: "unknownAccount" })]);
});

it("ignores a message for an admin Account and logs it with that Account", async () => {
  await database.owner.execute(sql`update accounts set role = 'admin' where id = ${accountId}`);
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));
  expect((await send(checkoutCompleted("sub_maya"))).status).toBe(200);
  expect(await records()).toEqual([]);
  expect(await refusals()).toEqual([{ result: "adminAccount", route: "/api/stripe/webhook", account_id: accountId }]);
});

it("ignores a subscription or customer that another Account's billing record holds", async () => {
  const other = await database.createAccountAsOwner({ email: "other@example.test", name: "Other" });
  if (!other) throw new Error("Account fixture already exists");
  await database.writeBillingRecordAsOwner(other.id, { stripeCustomerId: "cus_maya", stripeSubscriptionId: "sub_other" });
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));

  expect((await send(checkoutCompleted("sub_maya"))).status).toBe(200);

  expect(await records()).toEqual([expect.objectContaining({ account_id: other.id, stripe_subscription_id: "sub_other" })]);
  expect(await refusals()).toEqual([{ result: "otherAccount", route: "/api/stripe/webhook", account_id: accountId }]);
});

it("answers 500 when Stripe fails, saving nothing, so Stripe's retry is handled", async () => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));
  stripe.down = true;
  const body = checkoutCompleted("sub_maya");
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  const response = await send(body);

  expect(response.status).toBe(500);
  expect(await records()).toEqual([]);
  expect(await handledMessages()).toEqual([]);
  expect((await database.owner.execute(sql`select error_type from security_log where event = 'unexpected_failure'`)).rows)
    .toEqual([{ error_type: "StripeRequestFailed" }]);
  error.mockRestore();

  stripe.down = false;
  expect((await send(body)).status).toBe(200);
  expect(await records()).toEqual([expect.objectContaining({ stripe_subscription_id: "sub_maya" })]);
});

it("ignores and logs a newer subscription on a Stripe customer other than the billing record's", async () => {
  stripe.paidInvoices.set("sub_old", [1000]);
  stripe.subscriptions.set("sub_old", subscription("sub_old", accountId, { status: "active" }));
  stripe.subscriptions.set("sub_new", subscription("sub_new", accountId, { customer: "cus_stranger", created: 1_795_000_000 }));
  await send(subscriptionChanged("sub_old", "updated"));

  expect((await send(checkoutCompleted("sub_new"))).status).toBe(200);

  expect(await records()).toEqual([expect.objectContaining({ stripe_customer_id: "cus_old", stripe_subscription_id: "sub_old" })]);
  expect(await refusals()).toEqual([{ result: "otherAccount", route: "/api/stripe/webhook", account_id: accountId }]);
});

it("ends an unpaid plan's paid period where the unpaid period starts", async () => {
  stripe.paidInvoices.set("sub_maya", [1000]);
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, {
    status: "unpaid", items: { data: [{ current_period_start: PERIOD_END, current_period_end: PERIOD_END + 30 * 86_400, price: monthly }] },
  }));
  await send(subscriptionChanged("sub_maya", "updated"));
  expect(await records()).toEqual([expect.objectContaining({ stripe_status: "unpaid", paid_period_ends_at: new Date(PERIOD_END * 1000) })]);
});

it("saves the newest state when a second message about the subscription arrives while the first reads Stripe", async () => {
  stripe.paidInvoices.set("sub_maya", [0, 1000]);
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, { status: "past_due" }));
  let release = () => {};
  stripe.hold = new Promise((resolve) => { release = resolve; });

  const failed = send(invoice("sub_maya", false));
  await vi.waitFor(() => expect(stripe.requests).toHaveLength(1));
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId, { status: "active" }));
  const paid = send(invoice("sub_maya", true));
  await new Promise((resolve) => setTimeout(resolve, 200));
  release();
  await Promise.all([failed, paid]);

  expect(await records()).toEqual([expect.objectContaining({ stripe_status: "active", renewal_failed_at: null })]);
});

it("waits for a role change in progress and then ignores the message for the new admin", async () => {
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", accountId));
  let commitRoleChange = () => {};
  let roleLocked = () => {};
  const locked = new Promise<void>((resolve) => { roleLocked = resolve; });
  const roleChange = database.owner.transaction(async (tx) => {
    await tx.execute(sql`select id from accounts where id = ${accountId} for update`);
    await tx.execute(sql`update accounts set role = 'admin' where id = ${accountId}`);
    roleLocked();
    await new Promise<void>((resolve) => { commitRoleChange = resolve; });
  });
  await locked;

  const received = send(checkoutCompleted("sub_maya"));
  await vi.waitFor(() => expect(stripe.requests).toHaveLength(1));
  await new Promise((resolve) => setTimeout(resolve, 200));
  commitRoleChange();
  await roleChange;

  expect((await received).status).toBe(200);
  expect(await records()).toEqual([]);
  expect(await refusals()).toEqual([{ result: "adminAccount", route: "/api/stripe/webhook", account_id: accountId }]);
});
