import { createHmac, randomBytes } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { expectUnexpectedFailure } from "./plannedAnswer";
import { createStudent } from "../../src/lib/studentRepository";
import { createApprovedAnalyticsSnapshot } from "../../src/lib/analyticsSnapshotRepository";
import type { Student } from "../../src/lib/types";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => import("./fakeNavigation"));

import { hasPlanStarted, openStripeCheckout } from "../../src/app/onboarding/actions";
import OnboardingPage from "../../src/app/onboarding/page";
import DashboardPage from "../../src/app/dashboard/(this-week)/page";

const KEY = "sk_test_plan_choice_key";
const AUTH_SECRET = randomBytes(32).toString("hex");
const SITE = "https://copy.drillmap.test";
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/";

type FakeSession = { id: string; customer: string; status: "open" | "expired"; form: URLSearchParams };
const stripe = {
  customers: [] as { id: string; email: string; metadata: Record<string, string> }[],
  sessions: [] as FakeSession[],
  subscriptions: [] as { id: string; customer: string; status: string }[],
  invoices: [] as { id: string; customer: string; subscription: string; status: string }[],
  voidFailsOnce: false,
  endsAfterListing: [] as string[],
  down: false,
};

vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const headers = new Headers(init?.headers);
  if (url.origin !== "https://api.stripe.com") throw new Error("Not Stripe");
  if (headers.get("authorization") !== `Bearer ${KEY}`) return Response.json({ error: { type: "invalid_request_error" } }, { status: 401 });
  if (stripe.down) return Response.json({ error: { type: "api_error" } }, { status: 500 });
  // Stripe answers over the network, so two requests at once overlap.
  await new Promise((resolve) => setTimeout(resolve, 5));
  const post = init?.method === "POST";
  const form = new URLSearchParams(String(init?.body ?? ""));
  const query = url.searchParams;
  if (url.pathname === "/v1/customers" && !post) {
    return Response.json({ data: stripe.customers.filter((customer) => customer.email === query.get("email")) });
  }
  if (url.pathname === "/v1/customers" && post) {
    const customer = { id: `cus_test${stripe.customers.length + 1}`, email: form.get("email") ?? "", metadata: { account_id: form.get("metadata[account_id]") ?? "" } };
    stripe.customers.push(customer);
    return Response.json(customer);
  }
  if (url.pathname === "/v1/subscriptions" && !post) {
    const listed = structuredClone(stripe.subscriptions.filter((subscription) => subscription.customer === query.get("customer")));
    for (const subscription of stripe.subscriptions) {
      if (stripe.endsAfterListing.includes(subscription.id)) subscription.status = "canceled";
    }
    return Response.json({ data: listed });
  }
  if (url.pathname === "/v1/invoices" && !post) {
    return Response.json({ data: stripe.invoices.filter((invoice) => invoice.customer === query.get("customer") && invoice.status === query.get("status")) });
  }
  const voidPath = /^\/v1\/invoices\/(in_\w+)\/void$/.exec(url.pathname);
  const voiding = voidPath && post && stripe.invoices.find((invoice) => invoice.id === voidPath[1] && invoice.status === "open");
  if (voiding && stripe.voidFailsOnce) {
    stripe.voidFailsOnce = false;
    return Response.json({ error: { type: "api_error" } }, { status: 500 });
  }
  if (voiding) {
    voiding.status = "void";
    return Response.json(voiding);
  }
  if (url.pathname === "/v1/checkout/sessions" && !post) {
    return Response.json({ data: stripe.sessions.filter((session) => session.customer === query.get("customer") && session.status === query.get("status")) });
  }
  if (url.pathname === "/v1/checkout/sessions" && post) {
    const session: FakeSession = { id: `cs_test${stripe.sessions.length + 1}`, customer: form.get("customer") ?? "", status: "open", form };
    stripe.sessions.push(session);
    return Response.json({ id: session.id, url: `${CHECKOUT_URL}${session.id}` });
  }
  const cancel = /^\/v1\/subscriptions\/(sub_\w+)$/.exec(url.pathname);
  const cancelling = cancel && init?.method === "DELETE" && stripe.subscriptions.find((subscription) => subscription.id === cancel[1]);
  if (cancelling && cancelling.status !== "canceled") {
    if (stripe.sessions.length) throw new Error("Cancelled a subscription after Checkout started");
    cancelling.status = "canceled";
    return Response.json(cancelling);
  }
  const fetched = cancel && init?.method === "GET" && stripe.subscriptions.find((subscription) => subscription.id === cancel[1]);
  if (fetched) return Response.json(fetched);
  const expire = /^\/v1\/checkout\/sessions\/(cs_\w+)\/expire$/.exec(url.pathname);
  const expiring = expire && post && stripe.sessions.find((session) => session.id === expire[1] && session.status === "open");
  if (expiring) {
    expiring.status = "expired";
    return Response.json({ id: expiring.id, status: "expired" });
  }
  return Response.json({ error: { type: "invalid_request_error" } }, { status: 404 });
});

const database = setUpAppTestDatabase();

const WEDNESDAY = new Date("2026-11-11T15:00:00Z");
const FREE_WEEK_ENDS = new Date("2026-11-23T06:00:00Z");

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(WEDNESDAY);
  vi.stubEnv("STRIPE_SECRET_KEY", KEY);
  vi.stubEnv("STRIPE_PRICE_WEEKLY", "price_weekly_test");
  vi.stubEnv("STRIPE_PRICE_MONTHLY", "price_monthly_test");
  vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
  vi.stubEnv("SITE_URL", SITE);
  stripe.customers = [];
  stripe.sessions = [];
  stripe.subscriptions = [];
  stripe.invoices = [];
  stripe.endsAfterListing = [];
  stripe.voidFailsOnce = false;
  stripe.down = false;
  state.session = null;
  await database.owner.execute(sql`truncate accounts, security_log, used_free_weeks cascade`);
});
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function onboardedStudent(email = "maya@example.test", role: "student" | "admin" = "student") {
  const account = await database.createAccountAsOwner({ email, name: "Maya", role });
  if (!account) throw new Error("Account fixture already exists");
  const student = await createStudent(account.id, profile);
  if (!student) throw new Error("Student fixture already exists");
  await createApprovedAnalyticsSnapshot(student.id, {
    status: "approved", weekOf: "2026-11-09", lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [],
    rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
    approvedAt: WEDNESDAY, extraction: { source: "7sage_screenshot", extractedAt: WEDNESDAY },
    confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: WEDNESDAY },
  });
  state.session = { user: { id: account.id, role, email, name: "Maya" }, expires: "2099-01-01" };
  return { accountId: account.id, studentId: student.id };
}

const emailHash = (email: string) => createHmac("sha256", AUTH_SECRET).update(email).digest("hex");
const onboarding = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await OnboardingPage({ searchParams: Promise.resolve(searchParams) }));
const billingRows = async () => (await database.owner.execute(sql`select account_id from billing_records`)).rows;
const usedFreeWeekRows = async () => (await database.owner.execute(sql`select email_hash from used_free_weeks`)).rows;
const scheduleRows = async () => (await database.owner.execute(sql`select id from weekly_schedules`)).rows;

it("starts Checkout with a free week that ends at Monday 00:00 in Chicago, on the Account's own Stripe customer", async () => {
  const { accountId } = await onboardedStudent();

  await expect(openStripeCheckout("monthly")).resolves.toEqual({ checkoutUrl: `${CHECKOUT_URL}cs_test1` });

  expect(stripe.customers).toEqual([{ id: "cus_test1", email: "maya@example.test", metadata: { account_id: accountId } }]);
  expect(stripe.sessions).toHaveLength(1);
  expect(Object.fromEntries(stripe.sessions[0].form)).toEqual({
    mode: "subscription",
    customer: "cus_test1",
    "line_items[0][price]": "price_monthly_test",
    "line_items[0][quantity]": "1",
    payment_method_collection: "always",
    client_reference_id: accountId,
    "subscription_data[metadata][account_id]": accountId,
    "subscription_data[trial_end]": String(FREE_WEEK_ENDS.getTime() / 1000),
    "managed_payments[enabled]": "true",
    expires_at: String(new Date("2026-11-12T06:00:00Z").getTime() / 1000),
    success_url: `${SITE}/onboarding?checkout=done`,
    cancel_url: `${SITE}/onboarding?checkout=closed&plan=monthly`,
  });
});

it("closes the Account's open Checkout session before it opens another, on the same Stripe customer", async () => {
  await onboardedStudent();
  await openStripeCheckout("weekly");
  await openStripeCheckout("monthly");

  expect(stripe.customers).toHaveLength(1);
  expect(stripe.sessions.map(({ status, customer }) => ({ status, customer })))
    .toEqual([{ status: "expired", customer: "cus_test1" }, { status: "open", customer: "cus_test1" }]);
});

it("lets two clicks at the same moment leave one open Checkout session", async () => {
  await onboardedStudent();
  await Promise.all([openStripeCheckout("weekly"), openStripeCheckout("weekly")]);

  expect(stripe.customers).toHaveLength(1);
  expect(stripe.sessions.filter(({ status }) => status === "open")).toHaveLength(1);
});

it("starts no second Checkout while Stripe holds a plan whose message has not arrived, and shows Starting your plan", async () => {
  await onboardedStudent();
  await openStripeCheckout("weekly");
  stripe.subscriptions.push({ id: "sub_test1", customer: "cus_test1", status: "trialing" });

  await expect(openStripeCheckout("monthly")).rejects.toThrow("redirect:/onboarding?checkout=done");
  expect(stripe.sessions).toHaveLength(1);
});

it.each([
  ["at least 31 minutes on", "2026-11-12T05:50:00Z", "2026-11-12T06:21:00Z"],
  ["at most 23 hours on, on the day the clocks go back", "2027-11-07T05:30:00Z", "2027-11-08T04:30:00Z"],
])("closes a Checkout session at the next Chicago midnight, %s", async (_name, now, expires) => {
  await onboardedStudent();
  vi.setSystemTime(new Date(now));
  await openStripeCheckout("weekly");

  expect(stripe.sessions[0].form.get("expires_at")).toBe(String(new Date(expires).getTime() / 1000));
});

it("starts Checkout with no free week for an email in the used free week list", async () => {
  await onboardedStudent();
  await database.owner.execute(sql`insert into used_free_weeks (email_hash, used_on) values (${emailHash("maya@example.test")}, current_date - 300)`);

  await openStripeCheckout("weekly");

  expect(stripe.sessions[0].form.has("subscription_data[trial_end]")).toBe(false);
  expect(stripe.sessions[0].form.get("line_items[0][price]")).toBe("price_weekly_test");
  const page = await onboarding();
  expect(page).toContain("Your plan starts today. This email already had a free week.");
  expect(page).toContain("Wed, Nov 18");
});

it("gives no free week while an old used free week row waits for the daily cleanup", async () => {
  await onboardedStudent();
  await database.owner.execute(sql`
    insert into used_free_weeks (email_hash, used_on) values (${emailHash("maya@example.test")}, current_date - interval '12 months' - interval '1 day')
  `);

  await openStripeCheckout("weekly");

  expect(stripe.sessions[0].form.has("subscription_data[trial_end]")).toBe(false);
});

it("starts Checkout with no free week for a lapsed student, on their Stripe customer", async () => {
  const { accountId } = await onboardedStudent();
  await database.writeBillingRecordAsOwner(accountId, {
    stripeCustomerId: "cus_maya", stripeStatus: "canceled", paidPeriodEndsAt: new Date("2026-11-01T06:00:00Z"),
  });

  await openStripeCheckout("weekly");

  expect(stripe.sessions[0].form.has("subscription_data[trial_end]")).toBe(false);
  expect(stripe.sessions[0].form.get("customer")).toBe("cus_maya");
  expect(stripe.customers).toEqual([]);
  expect(Object.fromEntries(["success_url", "cancel_url"].map((key) => [key, stripe.sessions[0].form.get(key)]))).toEqual({
    success_url: `${SITE}/dashboard/upload?checkout=done`,
    cancel_url: `${SITE}/dashboard/upload?checkout=closed&plan=weekly`,
  });
  await expect(onboarding()).rejects.toThrow("redirect:/dashboard/upload");
});

it("sends a lapsed student whose new plan Stripe holds back to Starting your plan on the weekly upload page", async () => {
  const { accountId } = await onboardedStudent();
  await database.writeBillingRecordAsOwner(accountId, {
    stripeCustomerId: "cus_maya", stripeStatus: "canceled", paidPeriodEndsAt: new Date("2026-11-01T06:00:00Z"),
  });
  stripe.subscriptions.push({ id: "sub_restart", customer: "cus_maya", status: "active" });

  await expect(openStripeCheckout("weekly")).rejects.toThrow("redirect:/dashboard/upload?checkout=done");
  expect(stripe.sessions).toEqual([]);
});

it.each(["past_due", "unpaid", "paused"])("cancels a lapsed student's old %s plan before a restart's Checkout starts", async (status) => {
  const { accountId } = await onboardedStudent();
  await database.writeBillingRecordAsOwner(accountId, {
    stripeCustomerId: "cus_maya", stripeSubscriptionId: "sub_old", stripeStatus: "past_due", renewalFailedAt: new Date("2026-11-01T15:00:00Z"),
  });
  stripe.subscriptions.push(
    { id: "sub_old", customer: "cus_maya", status },
    { id: "sub_older", customer: "cus_maya", status: "canceled" },
  );

  await expect(openStripeCheckout("weekly")).resolves.toEqual({ checkoutUrl: `${CHECKOUT_URL}cs_test1` });

  expect(stripe.subscriptions.map(({ id, status }) => [id, status])).toEqual([["sub_old", "canceled"], ["sub_older", "canceled"]]);
  expect(stripe.sessions.map(({ status }) => status)).toEqual(["open"]);
});

it("voids the open invoice of a lapsed student's old plan when a restart cancels it, so the student cannot pay it", async () => {
  const { accountId } = await onboardedStudent();
  await database.writeBillingRecordAsOwner(accountId, {
    stripeCustomerId: "cus_maya", stripeSubscriptionId: "sub_old", stripeStatus: "past_due", renewalFailedAt: new Date("2026-11-01T15:00:00Z"),
  });
  stripe.subscriptions.push({ id: "sub_old", customer: "cus_maya", status: "past_due" });
  stripe.invoices.push(
    { id: "in_failed", customer: "cus_maya", subscription: "sub_old", status: "open" },
    { id: "in_paid", customer: "cus_maya", subscription: "sub_old", status: "paid" },
  );

  await expect(openStripeCheckout("weekly")).resolves.toEqual({ checkoutUrl: `${CHECKOUT_URL}cs_test1` });

  expect(stripe.invoices.map(({ id, status }) => [id, status])).toEqual([["in_failed", "void"], ["in_paid", "paid"]]);
});

it("voids the old plan's open invoice on the next try when voiding failed after the cancel", async () => {
  const { accountId } = await onboardedStudent();
  await database.writeBillingRecordAsOwner(accountId, {
    stripeCustomerId: "cus_maya", stripeSubscriptionId: "sub_old", stripeStatus: "past_due", renewalFailedAt: new Date("2026-11-01T15:00:00Z"),
  });
  stripe.subscriptions.push({ id: "sub_old", customer: "cus_maya", status: "past_due" });
  stripe.invoices.push({ id: "in_failed", customer: "cus_maya", subscription: "sub_old", status: "open" });
  stripe.voidFailsOnce = true;

  await expectUnexpectedFailure(database, openStripeCheckout("weekly"), "StripeRequestFailed");
  expect(stripe.subscriptions.map(({ status }) => status)).toEqual(["canceled"]);
  await expect(openStripeCheckout("weekly")).resolves.toEqual({ checkoutUrl: `${CHECKOUT_URL}cs_test1` });

  expect(stripe.invoices.map(({ id, status }) => [id, status])).toEqual([["in_failed", "void"]]);
});

it("starts Checkout without the failure notice when Stripe ends the old plan just before the restart cancels it", async () => {
  const { accountId } = await onboardedStudent();
  await database.writeBillingRecordAsOwner(accountId, {
    stripeCustomerId: "cus_maya", stripeSubscriptionId: "sub_old", stripeStatus: "past_due", renewalFailedAt: new Date("2026-11-01T15:00:00Z"),
  });
  stripe.subscriptions.push({ id: "sub_old", customer: "cus_maya", status: "past_due" });
  stripe.invoices.push({ id: "in_failed", customer: "cus_maya", subscription: "sub_old", status: "open" });
  stripe.endsAfterListing = ["sub_old"];

  await expect(openStripeCheckout("weekly")).resolves.toEqual({ checkoutUrl: `${CHECKOUT_URL}cs_test1` });

  expect(stripe.invoices.map(({ id, status }) => [id, status])).toEqual([["in_failed", "void"]]);
});

it("keeps a lapsed student's old plan that a late retry paid, and shows Starting your plan until its message arrives", async () => {
  const { accountId } = await onboardedStudent();
  await database.writeBillingRecordAsOwner(accountId, {
    stripeCustomerId: "cus_maya", stripeSubscriptionId: "sub_old", stripeStatus: "past_due", renewalFailedAt: new Date("2026-11-01T15:00:00Z"),
  });
  stripe.subscriptions.push({ id: "sub_old", customer: "cus_maya", status: "active" });

  await expect(openStripeCheckout("weekly")).rejects.toThrow("redirect:/dashboard/upload?checkout=done");
  expect(stripe.subscriptions).toEqual([{ id: "sub_old", customer: "cus_maya", status: "active" }]);
  expect(stripe.sessions).toEqual([]);
});

it.each([
  ["in the free week", { stripeStatus: "trialing", freeWeekEndsAt: FREE_WEEK_ENDS, firstChargeSucceeded: false }],
  ["on a paid plan", {}],
  ["retrying a renewal", { stripeStatus: "past_due", renewalFailedAt: new Date("2026-11-10T15:00:00Z") }],
] as const)("refuses Checkout for a student %s and starts nothing on Stripe", async (_name, billing) => {
  const { accountId } = await onboardedStudent();
  await database.writeBillingRecordAsOwner(accountId, billing);

  await expect(openStripeCheckout("weekly")).rejects.toThrow("redirect:/dashboard");
  await expect(onboarding()).rejects.toThrow("redirect:/dashboard");
  expect(stripe.sessions).toEqual([]);
});

it("refuses Checkout for an admin, a visitor with no session, and an Account that has not saved onboarding", async () => {
  await expect(openStripeCheckout("weekly")).rejects.toThrow("redirect:/login");
  await onboardedStudent("admin@example.test", "admin");
  await expect(openStripeCheckout("weekly")).rejects.toThrow("redirect:/dashboard");
  await expect(onboarding()).rejects.toThrow("redirect:/dashboard");

  const fresh = await database.createAccountAsOwner({ email: "new@example.test", name: "New" });
  if (!fresh) throw new Error("Account fixture already exists");
  state.session = { user: { id: fresh.id, role: "student", email: "new@example.test", name: "New" }, expires: "2099-01-01" };
  await expect(openStripeCheckout("weekly")).rejects.toThrow("redirect:/onboarding");
  expect(stripe.sessions).toEqual([]);
});

it("answers an unknown plan or a Stripe failure with the failure notice, saving nothing", async () => {
  await onboardedStudent();
  await expectUnexpectedFailure(database, openStripeCheckout("yearly"), "Error");
  stripe.down = true;
  await expectUnexpectedFailure(database, openStripeCheckout("weekly"), "StripeRequestFailed");
  expect(await billingRows()).toEqual([]);
});

it.each([
  ["missing", ""],
  ["refused by Stripe", "sk_test_revoked_key"],
])("answers Checkout with the failure notice and logs StripeKeyProblem when the Stripe key is %s", async (_problem, key) => {
  await onboardedStudent();
  vi.stubEnv("STRIPE_SECRET_KEY", key);

  await expectUnexpectedFailure(database, openStripeCheckout("weekly"), "StripeKeyProblem");
  expect(stripe.customers).toEqual([]);
  expect(stripe.sessions).toEqual([]);
  expect(await billingRows()).toEqual([]);
});

it("shows a new student plan choice as onboarding's last step and builds no weekly schedule until Stripe confirms the plan", async () => {
  const { accountId } = await onboardedStudent();

  const page = await onboarding();
  expect(page).toContain("Step 5 of 5 · Plan");
  expect(page).toContain("Sunday, Nov 22");
  expect(page).toContain("Mon, Nov 23");
  await expect(DashboardPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/onboarding");
  expect(await scheduleRows()).toEqual([]);
  await expect(hasPlanStarted()).resolves.toBe(false);

  await database.writeBillingRecordAsOwner(accountId, { stripeStatus: "trialing", freeWeekEndsAt: FREE_WEEK_ENDS, firstChargeSucceeded: false });
  await expect(hasPlanStarted()).resolves.toBe(true);
  await expect(onboarding({ checkout: "done" })).rejects.toThrow("redirect:/dashboard");
  await DashboardPage({ searchParams: Promise.resolve({}) });
  expect(await scheduleRows()).toHaveLength(1);
});

it("returns from a closed Checkout to plan choice with the last plan picked, and nothing started", async () => {
  await onboardedStudent();
  await openStripeCheckout("monthly");

  const page = await onboarding({ checkout: "closed", plan: "monthly" });

  expect(page).toContain("You didn’t add a card.");
  expect(page).toContain('checked="" value="monthly"');
  expect(await billingRows()).toEqual([]);
  expect(await usedFreeWeekRows()).toEqual([]);
  expect(await scheduleRows()).toEqual([]);
});

it("shows Starting your plan after Checkout until Stripe confirms, and changes no billing state on the way back", async () => {
  await onboardedStudent();

  expect(await onboarding({ checkout: "done" })).toContain("Starting your plan…");
  expect(await billingRows()).toEqual([]);
});
