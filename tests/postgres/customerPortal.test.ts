import { sql } from "drizzle-orm";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { openCustomerPortalSession } from "../../src/lib/billingRepository";
import { setUpAppTestDatabase } from "./appTestDatabase";

const KEY = "sk_test_portal_key";
const PORTAL_URL = "https://billing.stripe.com/p/session/test_portal";
const portalRequests: URLSearchParams[] = [];

vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  if (url.href !== "https://api.stripe.com/v1/billing_portal/sessions" || init?.method !== "POST"
    || new Headers(init.headers).get("authorization") !== `Bearer ${KEY}`) throw new Error("Not a Customer Portal request");
  portalRequests.push(new URLSearchParams(String(init.body)));
  return Response.json({ id: "bps_test_1", object: "billing_portal.session", url: PORTAL_URL });
});

const database = setUpAppTestDatabase();

beforeEach(async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", KEY);
  vi.stubEnv("SITE_URL", "https://drillmap.example");
  portalRequests.length = 0;
  await database.owner.execute(sql`truncate accounts cascade`);
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

it("opens the student's own Customer Portal session, which returns to Account", async () => {
  const maya = await account("maya@example.test");
  await database.writeBillingRecordAsOwner(maya, { stripeCustomerId: "cus_maya" });
  await database.writeBillingRecordAsOwner(await account("ana@example.test"), { stripeCustomerId: "cus_ana" });

  expect(await openCustomerPortalSession(maya)).toBe(PORTAL_URL);
  expect(portalRequests.map((form) => Object.fromEntries(form))).toEqual([
    { customer: "cus_maya", return_url: "https://drillmap.example/account" },
  ]);
});

it("opens none for an admin, a student with no plan, or an Account that does not exist", async () => {
  const admin = await account("admin@example.test", "admin");
  await database.writeBillingRecordAsOwner(admin, { stripeCustomerId: "cus_admin" });
  const noPlan = await account("new@example.test");

  for (const id of [admin, noPlan, "00000000-0000-4000-8000-000000000000", "not-an-id"]) {
    expect(await openCustomerPortalSession(id)).toBeNull();
  }
  expect(portalRequests).toEqual([]);
});
