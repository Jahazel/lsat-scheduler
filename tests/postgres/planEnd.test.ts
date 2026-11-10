import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { deleteAccount } from "../../src/app/account/actions";
import { endPlanAndMakeAdmin } from "../../src/lib/adminPromotion";
import { runDailyCleanup } from "../../src/lib/dailyCleanup";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session, signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-vercel-forwarded-for": "203.0.113.1" }) }));

const KEY = "sk_test_plan_end_key";

const stripe = vi.hoisted(() => ({
  subscriptions: new Map<string, { customer: string; status: string }>(),
  requests: [] as string[],
  failing: false,
  accountsWhenCancelled: [] as number[],
}));

const database = setUpAppTestDatabase();

vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  if (url.origin !== "https://api.stripe.com" || new Headers(init?.headers).get("authorization") !== `Bearer ${KEY}`) {
    throw new Error("Not a Stripe request");
  }
  const method = init?.method ?? "GET";
  stripe.requests.push(`${method} ${url.pathname}${url.search}`);
  if (stripe.failing) return Response.json({ error: { type: "api_error" } }, { status: 500 });
  if (method === "GET" && url.pathname === "/v1/subscriptions") {
    const customer = url.searchParams.get("customer");
    const open = [...stripe.subscriptions].filter(([, s]) => s.customer === customer && s.status !== "canceled");
    return Response.json({ object: "list", data: open.map(([id, s]) => ({ id, object: "subscription", status: s.status })), has_more: false });
  }
  const cancelled = /^\/v1\/subscriptions\/(sub_\w+)$/.exec(url.pathname);
  if (method === "DELETE" && cancelled) {
    const subscription = stripe.subscriptions.get(cancelled[1]);
    if (!subscription || subscription.status === "canceled") {
      return Response.json({ error: { type: "invalid_request_error" } }, { status: 400 });
    }
    subscription.status = "canceled";
    const { rows } = await database.owner.execute(sql`select count(*)::int as accounts from accounts`);
    stripe.accountsWhenCancelled.push(Number(rows[0].accounts));
    return Response.json({ id: cancelled[1], object: "subscription", status: "canceled" });
  }
  throw new Error(`Unexpected Stripe request ${method} ${url.pathname}`);
});

beforeEach(async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", KEY);
  vi.stubEnv("AUTH_SECRET", "plan-end-test-auth-secret".padEnd(32, "-"));
  stripe.subscriptions.clear();
  stripe.requests.length = 0;
  stripe.accountsWhenCancelled.length = 0;
  stripe.failing = false;
  state.session = null;
  await database.owner.execute(sql`truncate accounts, deletion_list, security_log cascade`);
});
afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function student(email: string) {
  const account = await database.createAccountAsOwner({ email, name: email, role: "student" });
  if (!account) throw new Error("Account fixture already exists");
  return account;
}

async function studentWithPlan(email: string, status = "trialing") {
  const account = await student(email);
  const customer = `cus_${email.split("@")[0]}`;
  await database.writeBillingRecordAsOwner(account.id, {
    stripeCustomerId: customer, stripeSubscriptionId: `sub_${email.split("@")[0]}`,
  });
  stripe.subscriptions.set(`sub_${email.split("@")[0]}`, { customer, status });
  return account;
}

function signIn(account: { id: string; role: "student" | "admin" }, email: string) {
  state.session = {
    user: { ...account, email, name: email }, signedInAt: Math.floor(Date.now() / 1000), expires: "2099-01-01",
  };
}

function deleteConfirmed() {
  const form = new FormData();
  form.set("confirmation", "DELETE");
  return deleteAccount(null, form);
}

async function accountRows() {
  const { rows } = await database.owner.execute(sql`
    select a.email, a.role, a.deleting_since is not null as deleting, b.stripe_subscription_id
    from accounts a left join billing_records b on b.account_id = a.id order by a.email
  `);
  return rows;
}

async function securityEvents() {
  const { rows } = await database.owner.execute(sql`select event, result, error_type from security_log order by event`);
  return rows;
}

it("deleting an Account with a plan cancels its subscription in Stripe before the Account is removed", async () => {
  const maya = await studentWithPlan("maya@example.test");
  await studentWithPlan("ana@example.test", "active");
  signIn(maya, "maya@example.test");

  expect(await deleteConfirmed()).toEqual({ goTo: "/?signedOut=1" });

  expect(stripe.requests).toEqual([
    "GET /v1/subscriptions?customer=cus_maya&limit=100",
    "DELETE /v1/subscriptions/sub_maya",
  ]);
  expect(stripe.accountsWhenCancelled).toEqual([2]);
  expect(stripe.subscriptions.get("sub_maya")?.status).toBe("canceled");
  expect(stripe.subscriptions.get("sub_ana")?.status).toBe("active");
  expect(await accountRows()).toEqual([
    { email: "ana@example.test", role: "student", deleting: false, stripe_subscription_id: "sub_ana" },
  ]);
});

it("deleting an Account with no plan makes no Stripe request", async () => {
  const maya = await student("maya@example.test");
  signIn(maya, "maya@example.test");
  vi.stubEnv("STRIPE_SECRET_KEY", "");

  expect(await deleteConfirmed()).toEqual({ goTo: "/?signedOut=1" });

  expect(stripe.requests).toEqual([]);
  expect(await accountRows()).toEqual([]);
});

it("a Stripe failure stops the deletion with the planned refusal, and the daily job finishes it later", async () => {
  const maya = await studentWithPlan("maya@example.test");
  signIn(maya, "maya@example.test");
  stripe.failing = true;

  expect(await deleteConfirmed()).toEqual({ goTo: "/login?notice=DeletionWillFinish&signedOut=1" });

  expect(stripe.subscriptions.get("sub_maya")?.status).toBe("trialing");
  expect(await accountRows()).toEqual([
    { email: "maya@example.test", role: "student", deleting: true, stripe_subscription_id: "sub_maya" },
  ]);
  expect(await securityEvents()).toEqual([
    { event: "account_deletion", result: "willFinish", error_type: null },
    { event: "unexpected_failure", result: "failed", error_type: "StripeRequestFailed" },
  ]);

  stripe.failing = false;
  expect(await runDailyCleanup()).toMatchObject({ accountDeletionsFinished: 1, accountDeletionsLeft: 0 });
  expect(stripe.subscriptions.get("sub_maya")?.status).toBe("canceled");
  expect(await accountRows()).toEqual([]);
});

it("finishes a deletion whose subscription Stripe already cancelled, with no second cancel", async () => {
  const maya = await studentWithPlan("maya@example.test", "canceled");
  await database.owner.execute(sql`update accounts set deleting_since = now() where id = ${maya.id}`);

  expect(await runDailyCleanup()).toMatchObject({ accountDeletionsFinished: 1, accountDeletionsLeft: 0 });

  expect(stripe.requests).toEqual(["GET /v1/subscriptions?customer=cus_maya&limit=100"]);
  expect(await accountRows()).toEqual([]);
});

it("making an Account with a plan an admin cancels its subscription at once", async () => {
  await studentWithPlan("maya@example.test", "active");

  expect(await endPlanAndMakeAdmin("Maya@Example.test", database.owner)).toBe("promoted");

  expect(stripe.requests).toEqual([
    "GET /v1/subscriptions?customer=cus_maya&limit=100",
    "DELETE /v1/subscriptions/sub_maya",
  ]);
  expect(stripe.subscriptions.get("sub_maya")?.status).toBe("canceled");
  expect(await accountRows()).toEqual([
    { email: "maya@example.test", role: "admin", deleting: false, stripe_subscription_id: "sub_maya" },
  ]);
});

it("keeps the Account a student when Stripe fails to cancel its plan", async () => {
  await studentWithPlan("maya@example.test", "active");
  stripe.failing = true;

  expect(await endPlanAndMakeAdmin("maya@example.test", database.owner)).toBe("plan-not-ended");

  expect(stripe.subscriptions.get("sub_maya")?.status).toBe("active");
  expect(await accountRows()).toEqual([
    { email: "maya@example.test", role: "student", deleting: false, stripe_subscription_id: "sub_maya" },
  ]);
});

it("makes an Account with no plan an admin with no Stripe request", async () => {
  await student("maya@example.test");
  vi.stubEnv("STRIPE_SECRET_KEY", "");

  expect(await endPlanAndMakeAdmin("maya@example.test", database.owner)).toBe("promoted");

  expect(stripe.requests).toEqual([]);
  expect(await accountRows()).toEqual([
    { email: "maya@example.test", role: "admin", deleting: false, stripe_subscription_id: null },
  ]);
});
