import { eq } from "drizzle-orm";
import { isAccountId } from "./accountRepository";
import { planStatus, type BillingRecord, type PlanStatus } from "./planStatus";
import { getPostgresDatabase } from "./postgres";
import { accounts, billingRecords } from "./postgresSchema";

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
    })
    .from(accounts)
    .leftJoin(billingRecords, eq(billingRecords.accountId, accounts.id))
    .where(eq(accounts.id, accountId));
  if (!row) return { status: { kind: "no_plan" }, record: null };
  const { role, plan, stripeStatus, firstChargeSucceeded, ...dates } = row;
  const record = plan && stripeStatus && firstChargeSucceeded !== null
    ? { plan, stripeStatus, firstChargeSucceeded, ...dates }
    : null;
  return { status: planStatus(role, record, new Date()), record };
}
