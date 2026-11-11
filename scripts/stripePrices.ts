import { z } from "zod";
import { PLAN_PRICES, type PlanPrices } from "../src/lib/planPrices";
import { settingProblems, type SettingProblem } from "./settingProblems";

const configSchema = z.object({
  STRIPE_SECRET_KEY: z.string().regex(/^(sk_test|rk_test|rk_live)_\w+$/),
  STRIPE_PRICE_WEEKLY: z.string().regex(/^price_\w+$/),
  STRIPE_PRICE_MONTHLY: z.string().regex(/^price_\w+$/),
}).superRefine((config, context) => {
  if (config.STRIPE_PRICE_WEEKLY !== config.STRIPE_PRICE_MONTHLY) return;
  for (const setting of ["STRIPE_PRICE_WEEKLY", "STRIPE_PRICE_MONTHLY"]) context.addIssue({ code: "custom", path: [setting], message: "Both plans use the same price ID." });
});

const priceSchema = z.object({
  active: z.boolean(),
  currency: z.string(),
  unit_amount: z.number().int().nullable(),
  livemode: z.boolean(),
  recurring: z.object({ interval: z.string(), interval_count: z.number().int() }).nullable(),
});

type Plan = "weekly" | "monthly";
type Mode = "live" | "test";
type Problem =
  | { plan: Plan; problem: "inactive" }
  | { plan: Plan; problem: "currency"; stripeCurrency: string }
  | { plan: Plan; problem: "amount"; stripeCents: number | null; expectedCents: number }
  | { plan: Plan; problem: "repeat"; stripeRepeat: string }
  | { plan: Plan; problem: "mode"; stripeMode: Mode; otherMode: Mode };
type PriceReport =
  | { ok: true; status: "match"; mode: Mode }
  | { ok: false; status: "mismatch"; problems: Problem[] }
  | { ok: false; status: "configuration-failed"; settings: SettingProblem<keyof z.infer<typeof configSchema>>[] }
  | { ok: false; status: "checker-failed" };

const PLANS = [
  { plan: "weekly", idSetting: "STRIPE_PRICE_WEEKLY", interval: "week", cents: (prices: PlanPrices) => prices.weeklyCents },
  { plan: "monthly", idSetting: "STRIPE_PRICE_MONTHLY", interval: "month", cents: (prices: PlanPrices) => prices.monthlyCents },
] as const;

const modeOf = (livemode: boolean): Mode => (livemode ? "live" : "test");

export async function runStripePriceCheck({ env, fetcher = fetch, prices = PLAN_PRICES }: {
  env: Readonly<Record<string, string | undefined>>;
  fetcher?: typeof fetch;
  prices?: PlanPrices;
}): Promise<PriceReport> {
  const config = configSchema.safeParse(env);
  if (!config.success) return { ok: false, status: "configuration-failed", settings: settingProblems(configSchema.keyof().options, config.error, env) };

  const problems: Problem[] = [];
  let firstMode: Mode | undefined;
  for (const { plan, idSetting, interval, cents } of PLANS) {
    let response: Response;
    try {
      response = await fetcher(`https://api.stripe.com/v1/prices/${config.data[idSetting]}`, {
        method: "GET",
        headers: { authorization: `Bearer ${config.data.STRIPE_SECRET_KEY}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return { ok: false, status: "checker-failed" };
    }
    if (!response.ok) return { ok: false, status: "checker-failed" };
    const price = priceSchema.safeParse(await response.json().catch(() => null));
    if (!price.success) return { ok: false, status: "checker-failed" };

    const { active, currency, unit_amount, livemode, recurring } = price.data;
    if (!active) problems.push({ plan, problem: "inactive" });
    if (currency !== "usd") problems.push({ plan, problem: "currency", stripeCurrency: currency });
    if (unit_amount !== cents(prices)) problems.push({ plan, problem: "amount", stripeCents: unit_amount, expectedCents: cents(prices) });
    if (recurring?.interval !== interval || recurring.interval_count !== 1) {
      const stripeRepeat = recurring ? `every ${recurring.interval_count} ${recurring.interval}` : "one time";
      problems.push({ plan, problem: "repeat", stripeRepeat });
    }
    const mode = modeOf(livemode);
    firstMode ??= mode;
    if (mode !== firstMode) problems.push({ plan, problem: "mode", stripeMode: mode, otherMode: firstMode });
  }

  if (problems.length > 0 || !firstMode) return { ok: false, status: "mismatch", problems };
  return { ok: true, status: "match", mode: firstMode };
}
