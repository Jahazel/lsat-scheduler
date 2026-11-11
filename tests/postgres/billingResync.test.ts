import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { billingResyncReport, resyncBillingRecords } from "../../src/lib/stripeMessages";
import { setUpAppTestDatabase } from "./appTestDatabase";

const KEY = "sk_test_resync_key";
const FREE_WEEK_END = 1_794_000_000;
const PERIOD_END = FREE_WEEK_END + 7 * 86_400;
const PAGE_SIZE = 2;

type FakeSubscription = {
  id: string; customer: string; status: string; created: number; metadata: Record<string, string>;
  trial_end: number | null; ended_at: number | null; cancel_at: number | null; cancel_at_period_end: boolean;
  items: { data: { current_period_start: number; current_period_end: number; price: { recurring: { interval: string; interval_count: number } } }[] };
  latest_invoice: { created: number; status_transitions: { finalized_at: number | null } } | null;
};

const stripe = {
  subscriptions: new Map<string, FakeSubscription>(),
  paidInvoices: new Map<string, number[]>(),
  down: false,
  cancels: [] as string[],
};

vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  if (url.origin !== "https://api.stripe.com" || new Headers(init?.headers).get("authorization") !== `Bearer ${KEY}`) {
    throw new Error("Not Stripe");
  }
  if (stripe.down) return Response.json({ error: { type: "api_error" } }, { status: 500 });
  if (init?.method === "DELETE") stripe.cancels.push(url.pathname);
  if (url.pathname === "/v1/subscriptions") {
    if (url.searchParams.get("status") !== "all") return Response.json({ data: [], has_more: false });
    const all = [...stripe.subscriptions.values()].sort((a, b) => b.created - a.created || b.id.localeCompare(a.id));
    const after = url.searchParams.get("starting_after");
    const start = after ? all.findIndex((found) => found.id === after) + 1 : 0;
    return Response.json({ data: all.slice(start, start + PAGE_SIZE), has_more: start + PAGE_SIZE < all.length });
  }
  const one = /^\/v1\/subscriptions\/(sub_\w+)$/.exec(url.pathname);
  if (one) {
    const found = stripe.subscriptions.get(one[1]);
    return found ? Response.json(found) : Response.json({ error: { type: "invalid_request_error" } }, { status: 404 });
  }
  if (url.pathname === "/v1/invoices" && url.searchParams.get("status") === "paid") {
    const amounts = stripe.paidInvoices.get(url.searchParams.get("subscription") ?? "") ?? [];
    return Response.json({ data: amounts.map((amount_paid) => ({ amount_paid })) });
  }
  return Response.json({ error: { type: "invalid_request_error" } }, { status: 404 });
});

const database = setUpAppTestDatabase();

beforeEach(async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", KEY);
  stripe.subscriptions.clear();
  stripe.paidInvoices.clear();
  stripe.down = false;
  stripe.cancels = [];
  await database.owner.execute(sql`truncate accounts, stripe_messages, deletion_list cascade`);
});
afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function account(email: string, role: "student" | "admin" = "student") {
  const created = await database.createAccountAsOwner({ email, name: email, role });
  if (!created) throw new Error("Account fixture already exists");
  return created.id;
}

function subscription(id: string, owner: string, changes: Partial<FakeSubscription> = {}): FakeSubscription {
  return {
    id, customer: `cus_${id.slice(4)}`, status: "trialing", created: 1_793_400_000, metadata: { account_id: owner },
    trial_end: FREE_WEEK_END, ended_at: null, cancel_at: null, cancel_at_period_end: false,
    items: { data: [{
      current_period_start: FREE_WEEK_END - 7 * 86_400, current_period_end: FREE_WEEK_END,
      price: { recurring: { interval: "week", interval_count: 1 } },
    }] },
    latest_invoice: { created: 1_793_400_000, status_transitions: { finalized_at: 1_793_400_000 } },
    ...changes,
  };
}

const paidMonthly = (id: string, owner: string, changes: Partial<FakeSubscription> = {}) => subscription(id, owner, {
  status: "active", trial_end: null,
  items: { data: [{ current_period_start: FREE_WEEK_END, current_period_end: PERIOD_END, price: { recurring: { interval: "month", interval_count: 1 } } }] },
  ...changes,
});

const records = async () => (await database.owner.execute(sql`
  select account_id, stripe_customer_id, stripe_subscription_id, plan, stripe_status, free_week_ends_at, paid_period_ends_at,
    first_charge_succeeded, renewal_failed_at, cancel_at_period_end
  from billing_records order by account_id
`)).rows;

it("saves every Account's plan as Stripe holds it now, leaves out deleted and admin Accounts, and a second run changes nothing", async () => {
  const stale = await account("stale@example.test");
  const started = await account("started@example.test");
  const unchanged = await account("unchanged@example.test");
  const admin = await account("admin@example.test", "admin");
  await database.writeBillingRecordAsOwner(stale, {
    stripeCustomerId: "cus_stale", stripeSubscriptionId: "sub_stale", stripeStatus: "trialing", firstChargeSucceeded: false,
    freeWeekEndsAt: new Date(FREE_WEEK_END * 1000), paidPeriodEndsAt: new Date(FREE_WEEK_END * 1000),
  });
  stripe.subscriptions.set("sub_stale", subscription("sub_stale", stale, { status: "canceled", ended_at: FREE_WEEK_END - 86_400 }));
  stripe.subscriptions.set("sub_started", paidMonthly("sub_started", started));
  stripe.paidInvoices.set("sub_started", [2999]);
  stripe.subscriptions.set("sub_unchanged", subscription("sub_unchanged", unchanged));
  const deleted = randomUUID();
  await database.owner.execute(sql`insert into deletion_list (account_id, email_hash) values (${deleted}, repeat('a', 64))`);
  stripe.subscriptions.set("sub_deleted", paidMonthly("sub_deleted", deleted));
  stripe.subscriptions.set("sub_admin", paidMonthly("sub_admin", admin));

  const first = await resyncBillingRecords(database.owner, KEY);

  expect(first).toEqual({ listed: 5, saved: 3, leftOut: 2, unknownPrice: [], notInStripe: 0 });
  expect(stripe.cancels).toEqual([]);
  const saved = await records();
  expect(saved).toEqual([
    {
      account_id: stale, stripe_customer_id: "cus_stale", stripe_subscription_id: "sub_stale", plan: "weekly", stripe_status: "canceled",
      free_week_ends_at: expect.any(String), paid_period_ends_at: expect.any(String),
      first_charge_succeeded: false, renewal_failed_at: null, cancel_at_period_end: false,
    },
    {
      account_id: started, stripe_customer_id: "cus_started", stripe_subscription_id: "sub_started", plan: "monthly", stripe_status: "active",
      free_week_ends_at: null, paid_period_ends_at: expect.any(String),
      first_charge_succeeded: true, renewal_failed_at: null, cancel_at_period_end: false,
    },
    {
      account_id: unchanged, stripe_customer_id: "cus_unchanged", stripe_subscription_id: "sub_unchanged", plan: "weekly",
      stripe_status: "trialing", free_week_ends_at: expect.any(String), paid_period_ends_at: expect.any(String),
      first_charge_succeeded: false, renewal_failed_at: null, cancel_at_period_end: false,
    },
  ].sort((a, b) => a.account_id.localeCompare(b.account_id)));
  const [{ ended }] = (await database.owner.execute<{ ended: boolean }>(sql`
    select paid_period_ends_at = to_timestamp(${FREE_WEEK_END - 86_400}) as ended from billing_records where account_id = ${stale}
  `)).rows;
  expect(ended).toBe(true);

  expect(await resyncBillingRecords(database.owner, KEY)).toEqual(first);
  expect(await records()).toEqual(saved);
});

it("keeps an Account's newest plan whatever order Stripe lists its subscriptions in", async () => {
  const maya = await account("maya@example.test");
  stripe.subscriptions.set("sub_old", subscription("sub_old", maya, {
    customer: "cus_maya", status: "canceled", created: 1_793_000_000, ended_at: 1_793_300_000,
  }));
  stripe.subscriptions.set("sub_new", paidMonthly("sub_new", maya, { customer: "cus_maya", created: 1_793_500_000 }));
  stripe.paidInvoices.set("sub_new", [2999]);

  expect(await resyncBillingRecords(database.owner, KEY)).toEqual({ listed: 2, saved: 1, leftOut: 1, unknownPrice: [], notInStripe: 0 });
  expect(await records()).toEqual([expect.objectContaining({ stripe_subscription_id: "sub_new", stripe_status: "active" })]);

  await database.owner.execute(sql`truncate billing_records`);
  await database.writeBillingRecordAsOwner(maya, { stripeCustomerId: "cus_maya", stripeSubscriptionId: "sub_old" });
  expect(await resyncBillingRecords(database.owner, KEY)).toEqual({ listed: 2, saved: 1, leftOut: 1, unknownPrice: [], notInStripe: 0 });
  expect(await records()).toEqual([expect.objectContaining({ stripe_subscription_id: "sub_new", stripe_status: "active" })]);
});

it("skips a subscription whose price is not Weekly or Monthly, names it, and resyncs the rest", async () => {
  const yearly = await account("yearly@example.test");
  const maya = await account("maya@example.test");
  stripe.subscriptions.set("sub_yearly", paidMonthly("sub_yearly", yearly, {
    created: 1_793_500_000,
    items: { data: [{ current_period_start: FREE_WEEK_END, current_period_end: PERIOD_END, price: { recurring: { interval: "year", interval_count: 1 } } }] },
  }));
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", maya));

  const counts = await resyncBillingRecords(database.owner, KEY);

  expect(counts).toEqual({ listed: 2, saved: 1, leftOut: 0, unknownPrice: ["sub_yearly"], notInStripe: 0 });
  expect(await records()).toEqual([expect.objectContaining({ account_id: maya, stripe_subscription_id: "sub_maya" })]);
  expect(billingResyncReport(counts)).toBe("Stripe subscriptions: 2. Billing records saved: 1. Left out: 0. "
    + "Skipped for a price that is not Weekly or Monthly: 1 (sub_yearly). Billing records Stripe does not list: 0.\n");
});

it("takes a failing renewal's date from Stripe, not from the restored record", async () => {
  const maya = await account("maya@example.test");
  const renewalFailed = FREE_WEEK_END + 14 * 86_400;
  await database.writeBillingRecordAsOwner(maya, {
    stripeCustomerId: "cus_maya", stripeSubscriptionId: "sub_maya", stripeStatus: "past_due", renewalFailedAt: new Date(FREE_WEEK_END * 1000),
  });
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", maya, {
    status: "past_due", latest_invoice: { created: renewalFailed, status_transitions: { finalized_at: renewalFailed } },
  }));
  stripe.paidInvoices.set("sub_maya", [1000]);

  await resyncBillingRecords(database.owner, KEY);

  const [{ failed }] = (await database.owner.execute<{ failed: boolean }>(sql`
    select renewal_failed_at = to_timestamp(${renewalFailed}) as failed from billing_records
  `)).rows;
  expect(failed).toBe(true);
});

it("counts a billing record whose subscription Stripe does not list, and leaves it as it was", async () => {
  const lost = await account("lost@example.test");
  await database.writeBillingRecordAsOwner(lost, { stripeCustomerId: "cus_lost", stripeSubscriptionId: "sub_lost" });
  const before = await records();

  expect(await resyncBillingRecords(database.owner, KEY)).toEqual({ listed: 0, saved: 0, leftOut: 0, unknownPrice: [], notInStripe: 1 });
  expect(await records()).toEqual(before);
});

it("saves nothing when Stripe fails, so the run can start again", async () => {
  const maya = await account("maya@example.test");
  stripe.subscriptions.set("sub_maya", subscription("sub_maya", maya));
  stripe.down = true;

  await expect(resyncBillingRecords(database.owner, KEY)).rejects.toThrow("Stripe answered 500");
  expect(await records()).toEqual([]);
});

function runScript(env: Record<string, string>) {
  return new Promise<{ code: number; output: string }>((resolve) => {
    execFile(process.execPath, ["--import", "tsx", "scripts/resync-billing.mts"], {
      env: { PATH: process.env.PATH, NODE_ENV: "test", ...env }, timeout: 15000,
    }, (error, stdout, stderr) => resolve({ code: typeof error?.code === "number" ? error.code : 0, output: stdout + stderr }));
  });
}

it("refuses to run without a Stripe key", async () => {
  expect(await runScript({ DATABASE_URL: database.ownerSetting })).toEqual({ code: 1, output: "STRIPE_SECRET_KEY is not set.\n" });
});

it("refuses a database host that is not local or an approved copy", async () => {
  expect(await runScript({ DATABASE_URL: "postgres://owner@db.example.com/drillmap", STRIPE_SECRET_KEY: KEY }))
    .toEqual({ code: 1, output: expect.stringMatching(/^Refusing database host db\.example\.com: not an allowed host\./) });
});
