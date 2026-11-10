import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { isAccountId } from "./accountRepository";
import { configuredSiteUrl } from "./email";
import { planStatus, type BillingRecord, type PlanStatus } from "./planStatus";
import { getPostgresDatabase } from "./postgres";
import { accounts, billingRecords } from "./postgresSchema";
import { stripeRequest, stripeSecretKey } from "./stripeApi";

export type AccountPlan = { status: PlanStatus; record: BillingRecord | null };

export async function loadAccountPlan(accountId: string): Promise<AccountPlan> {
  if (!isAccountId(accountId)) return { status: { kind: "no_plan" }, record: null };
  const [row] = await getPostgresDatabase()
    .select({
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
    .leftJoin(billingRecords, eq(billingRecords.accountId, accounts.id))
    .where(eq(accounts.id, accountId));
  if (!row) return { status: { kind: "no_plan" }, record: null };
  const { role, plan, stripeStatus, firstChargeSucceeded, cancelAtPeriodEnd, ...dates } = row;
  const record = plan && stripeStatus && firstChargeSucceeded !== null && cancelAtPeriodEnd !== null
    ? { plan, stripeStatus, firstChargeSucceeded, cancelAtPeriodEnd, ...dates }
    : null;
  return { status: planStatus(role, record, new Date()), record };
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
