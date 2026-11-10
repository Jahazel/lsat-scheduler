import { expect, it } from "vitest";
import { PLAN_PRICES } from "../src/lib/planPrices";
import { runStripePriceCheck } from "./stripePrices";

const env = {
  STRIPE_SECRET_KEY: "sk_test_synthetic",
  STRIPE_WEEKLY_PRICE_ID: "price_weekly1",
  STRIPE_MONTHLY_PRICE_ID: "price_monthly1",
};

type Price = { id: string; active: boolean; currency: string; unit_amount: number | null; livemode: boolean; recurring: { interval: string; interval_count: number } | null };

const weekly: Price = { id: "price_weekly1", active: true, currency: "usd", unit_amount: PLAN_PRICES.weeklyCents, livemode: false, recurring: { interval: "week", interval_count: 1 } };
const monthly: Price = { id: "price_monthly1", active: true, currency: "usd", unit_amount: PLAN_PRICES.monthlyCents, livemode: false, recurring: { interval: "month", interval_count: 1 } };

function stripe(prices: Price[], status = 200) {
  const requests: { method: string; path: string; authorization: string | null }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ method: init?.method ?? "GET", path: url.pathname, authorization: new Headers(init?.headers).get("authorization") });
    if (status !== 200) return new Response("unavailable", { status });
    const price = prices.find((candidate) => url.pathname === `/v1/prices/${candidate.id}`);
    return price ? Response.json(price) : Response.json({ error: { type: "invalid_request_error" } }, { status: 404 });
  };
  return { requests, fetcher };
}

const check = (network: ReturnType<typeof stripe>, settings: Record<string, string | undefined> = env) =>
  runStripePriceCheck({ env: settings, fetcher: network.fetcher });

it("passes when both Stripe prices match the prices module, and reads each price by its ID with GET only", async () => {
  const network = stripe([weekly, monthly]);
  expect(await check(network)).toEqual({ ok: true, status: "match", mode: "test" });
  expect(network.requests).toEqual([
    { method: "GET", path: "/v1/prices/price_weekly1", authorization: "Bearer sk_test_synthetic" },
    { method: "GET", path: "/v1/prices/price_monthly1", authorization: "Bearer sk_test_synthetic" },
  ]);
});

it("names live mode when a restricted live key reads live prices", async () => {
  const network = stripe([{ ...weekly, livemode: true }, { ...monthly, livemode: true }]);
  expect(await check(network, { ...env, STRIPE_SECRET_KEY: "rk_live_read" })).toEqual({ ok: true, status: "match", mode: "live" });
});

it("fails when an amount differs from the prices module, and gives both amounts", async () => {
  const network = stripe([{ ...weekly, unit_amount: PLAN_PRICES.weeklyCents + 1 }, monthly]);
  expect(await check(network)).toEqual({
    ok: false,
    status: "mismatch",
    problems: [{ plan: "weekly", problem: "amount", stripeCents: PLAN_PRICES.weeklyCents + 1, expectedCents: PLAN_PRICES.weeklyCents }],
  });
});

it("fails on an inactive price, a non-dollar price, a missing amount, and a wrong repeat", async () => {
  const network = stripe([
    { ...weekly, active: false, currency: "eur" },
    { ...monthly, unit_amount: null, recurring: { interval: "month", interval_count: 2 } },
  ]);
  expect(await check(network)).toEqual({
    ok: false,
    status: "mismatch",
    problems: [
      { plan: "weekly", problem: "inactive" },
      { plan: "weekly", problem: "currency", stripeCurrency: "eur" },
      { plan: "monthly", problem: "amount", stripeCents: null, expectedCents: PLAN_PRICES.monthlyCents },
      { plan: "monthly", problem: "repeat", stripeRepeat: "every 2 month" },
    ],
  });
});

it("fails when the IDs are swapped, so each plan points at the other plan's price", async () => {
  const network = stripe([weekly, monthly]);
  const swapped = { ...env, STRIPE_WEEKLY_PRICE_ID: monthly.id, STRIPE_MONTHLY_PRICE_ID: weekly.id };
  const result = await check(network, swapped);
  expect(result.ok).toBe(false);
  expect(result).toMatchObject({ status: "mismatch", problems: expect.arrayContaining([
    { plan: "weekly", problem: "repeat", stripeRepeat: "every 1 month" },
    { plan: "monthly", problem: "repeat", stripeRepeat: "every 1 week" },
  ]) });
});

it("fails on a one-time price and on prices from different modes", async () => {
  const network = stripe([{ ...weekly, recurring: null }, { ...monthly, livemode: true }]);
  expect(await check(network)).toEqual({
    ok: false,
    status: "mismatch",
    problems: [
      { plan: "weekly", problem: "repeat", stripeRepeat: "one time" },
      { plan: "monthly", problem: "mode", stripeMode: "live", otherMode: "test" },
    ],
  });
});

it.each([
  [{ STRIPE_SECRET_KEY: undefined }, [{ setting: "STRIPE_SECRET_KEY", problem: "missing" }]],
  [{ STRIPE_SECRET_KEY: "pk_test_publishable" }, [{ setting: "STRIPE_SECRET_KEY", problem: "refused" }]],
  [{ STRIPE_SECRET_KEY: "sk_live_full" }, [{ setting: "STRIPE_SECRET_KEY", problem: "refused" }]],
  [{ STRIPE_WEEKLY_PRICE_ID: "" }, [{ setting: "STRIPE_WEEKLY_PRICE_ID", problem: "missing" }]],
  [{ STRIPE_MONTHLY_PRICE_ID: "price_x/../../customers" }, [{ setting: "STRIPE_MONTHLY_PRICE_ID", problem: "refused" }]],
  [{ STRIPE_MONTHLY_PRICE_ID: env.STRIPE_WEEKLY_PRICE_ID }, [{ setting: "STRIPE_MONTHLY_PRICE_ID", problem: "refused" }]],
  [{ STRIPE_SECRET_KEY: "sk_live_full", STRIPE_WEEKLY_PRICE_ID: undefined }, [
    { setting: "STRIPE_SECRET_KEY", problem: "refused" },
    { setting: "STRIPE_WEEKLY_PRICE_ID", problem: "missing" },
  ]],
])("names each missing or refused setting, without its value, before any request: %o", async (changed, settings) => {
  const network = stripe([weekly, monthly]);
  const result = await check(network, { ...env, ...changed });
  expect(result).toEqual({ ok: false, status: "configuration-failed", settings });
  expect(network.requests).toEqual([]);
  for (const value of Object.values(changed)) if (value) expect(JSON.stringify(result)).not.toContain(value);
});

it("fails without printing the key when Stripe refuses or returns an unknown price", async () => {
  for (const network of [stripe([weekly, monthly], 401), stripe([weekly])]) {
    const result = await check(network);
    expect(result).toEqual({ ok: false, status: "checker-failed" });
    expect(JSON.stringify(result)).not.toContain("sk_test_synthetic");
  }
});
