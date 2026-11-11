import { and, eq, inArray, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAccountId } from "./accountRepository";
import { configuredSiteUrl } from "./email";
import { planStatus, type BillingRecord, type PlanStatus } from "./planStatus";
import { getPostgresDatabase, type PostgresTransaction } from "./postgres";
import { accounts, billingRecords } from "./postgresSchema";
import { stripeRequest, stripeSecretKey } from "./stripeApi";

export type AccountPlan = { status: PlanStatus; record: BillingRecord | null };

function selectAccountPlans() {
  return getPostgresDatabase()
    .select({
      accountId: accounts.id,
      role: accounts.role,
      plan: billingRecords.plan,
      stripeStatus: billingRecords.stripeStatus,
      freeWeekEndsAt: billingRecords.freeWeekEndsAt,
      paidPeriodEndsAt: billingRecords.paidPeriodEndsAt,
      firstChargeSucceeded: billingRecords.firstChargeSucceeded,
      renewalFailedAt: billingRecords.renewalFailedAt,
      cancelAtPeriodEnd: billingRecords.cancelAtPeriodEnd,
    })
    .from(accounts)
    .leftJoin(billingRecords, eq(billingRecords.accountId, accounts.id));
}

type AccountPlanRow = Awaited<ReturnType<typeof selectAccountPlans>>[number];

function accountPlan(row: AccountPlanRow, realNow: Date): AccountPlan {
  const { plan, stripeStatus, firstChargeSucceeded, cancelAtPeriodEnd } = row;
  const record = plan && stripeStatus && firstChargeSucceeded !== null && cancelAtPeriodEnd !== null
    ? {
      plan, stripeStatus, firstChargeSucceeded, cancelAtPeriodEnd,
      freeWeekEndsAt: row.freeWeekEndsAt, paidPeriodEndsAt: row.paidPeriodEndsAt, renewalFailedAt: row.renewalFailedAt,
    }
    : null;
  return { status: planStatus(row.role, record, realNow), record };
}

export async function loadAccountPlan(accountId: string): Promise<AccountPlan> {
  if (!isAccountId(accountId)) return { status: { kind: "no_plan" }, record: null };
  const [row] = await selectAccountPlans().where(eq(accounts.id, accountId));
  return row ? accountPlan(row, new Date()) : { status: { kind: "no_plan" }, record: null };
}

export async function loadPlanStatuses(accountIds: string[]): Promise<Map<string, PlanStatus>> {
  const ids = accountIds.filter(isAccountId);
  if (ids.length === 0) return new Map();
  const rows = await selectAccountPlans().where(inArray(accounts.id, ids));
  const realNow = new Date();
  return new Map(rows.map((row) => [row.accountId, accountPlan(row, realNow).status]));
}

const portalSessionSchema = z.object({ url: z.string().startsWith("https://billing.stripe.com/") });

/** Opens a Stripe Customer Portal session for a student's own plan. An admin or an Account with no plan gets none. */
export async function openCustomerPortalSession(accountId: string): Promise<string | null> {
  if (!isAccountId(accountId)) return null;
  const [row] = await getPostgresDatabase()
    .select({ customer: billingRecords.stripeCustomerId })
    .from(billingRecords)
    .innerJoin(accounts, eq(accounts.id, billingRecords.accountId))
    .where(and(eq(billingRecords.accountId, accountId), ne(accounts.role, "admin")));
  if (!row) return null;
  const site = configuredSiteUrl();
  if (!site) throw new Error("SITE_URL is not set, so this place cannot send students back from Stripe.");
  const portal = await stripeRequest("billing_portal/sessions", stripeSecretKey(), {
    customer: row.customer,
    return_url: new URL("/account", site).toString(),
  });
  return portalSessionSchema.parse(portal).url;
}

const openSubscriptionsSchema = z.object({
  data: z.array(z.object({ id: z.string().regex(/^sub_\w+$/), status: z.string() })),
});

export async function endPlanNow(accountId: string, db: PostgresTransaction) {
  const [row] = await db.select({ customer: billingRecords.stripeCustomerId })
    .from(billingRecords)
    .where(eq(billingRecords.accountId, accountId));
  if (!row) return;
  const secretKey = stripeSecretKey();
  // Stripe lists every subscription except cancelled ones; an expired incomplete one cannot be cancelled.
  const open = openSubscriptionsSchema.parse(
    await stripeRequest(`subscriptions?customer=${encodeURIComponent(row.customer)}&limit=100`, secretKey),
  );
  for (const subscription of open.data) {
    if (subscription.status === "incomplete_expired") continue;
    await stripeRequest(`subscriptions/${subscription.id}`, secretKey, undefined, "DELETE");
  }
}

export async function loadChosenPlan(accountId: string): Promise<AccountPlan> {
  const plan = await loadAccountPlan(accountId);
  if (plan.status.kind === "no_plan") redirect("/onboarding");
  return plan;
}
