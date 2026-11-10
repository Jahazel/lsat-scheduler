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
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_plan_choice";

const stripe = { sessions: [] as { form: URLSearchParams; idempotencyKey: string | null }[], down: false };

vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const headers = new Headers(init?.headers);
  if (url.origin !== "https://api.stripe.com" || headers.get("authorization") !== `Bearer ${KEY}`) throw new Error("Not Stripe");
  if (stripe.down) return Response.json({ error: { type: "api_error" } }, { status: 500 });
  if (url.pathname === "/v1/checkout/sessions" && init?.method === "POST") {
    stripe.sessions.push({ form: new URLSearchParams(String(init.body)), idempotencyKey: headers.get("idempotency-key") });
    return Response.json({ id: "cs_test_plan_choice", url: CHECKOUT_URL });
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
  vi.stubEnv("STRIPE_WEEKLY_PRICE_ID", "price_weekly_test");
  vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_monthly_test");
  vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
  vi.stubEnv("SITE_URL", SITE);
  stripe.sessions = [];
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

it("starts Checkout with a free week that ends at Monday 00:00 in Chicago, linked to the signed-in Account", async () => {
  const { accountId } = await onboardedStudent();

  await expect(openStripeCheckout("monthly")).resolves.toEqual({ checkoutUrl: CHECKOUT_URL });

  expect(stripe.sessions).toHaveLength(1);
  expect(Object.fromEntries(stripe.sessions[0].form)).toEqual({
    mode: "subscription",
    "line_items[0][price]": "price_monthly_test",
    "line_items[0][quantity]": "1",
    payment_method_collection: "always",
    client_reference_id: accountId,
    "subscription_data[metadata][account_id]": accountId,
    "subscription_data[trial_end]": String(FREE_WEEK_ENDS.getTime() / 1000),
    "managed_payments[enabled]": "true",
    customer_email: "maya@example.test",
    success_url: `${SITE}/onboarding?checkout=done`,
    cancel_url: `${SITE}/onboarding?checkout=closed&plan=monthly`,
  });
});

it("gives two quick clicks for the same plan one Stripe idempotency key, so Stripe makes one Checkout session", async () => {
  await onboardedStudent();
  await openStripeCheckout("weekly");
  await openStripeCheckout("weekly");

  const [first, second] = stripe.sessions.map((session) => session.idempotencyKey);
  expect(first).toBeTruthy();
  expect(second).toBe(first);
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

it("gives a free week again once the used free week row is more than 12 months old", async () => {
  await onboardedStudent();
  await database.owner.execute(sql`
    insert into used_free_weeks (email_hash, used_on) values (${emailHash("maya@example.test")}, current_date - interval '12 months' - interval '1 day')
  `);

  await openStripeCheckout("weekly");

  expect(stripe.sessions[0].form.get("subscription_data[trial_end]")).toBe(String(FREE_WEEK_ENDS.getTime() / 1000));
});

it("starts Checkout with no free week for a lapsed student, on their Stripe customer", async () => {
  const { accountId } = await onboardedStudent();
  await database.writeBillingRecordAsOwner(accountId, {
    stripeCustomerId: "cus_maya", stripeStatus: "canceled", paidPeriodEndsAt: new Date("2026-11-01T06:00:00Z"),
  });

  await openStripeCheckout("weekly");

  expect(stripe.sessions[0].form.has("subscription_data[trial_end]")).toBe(false);
  expect(stripe.sessions[0].form.get("customer")).toBe("cus_maya");
  expect(stripe.sessions[0].form.has("customer_email")).toBe(false);
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
