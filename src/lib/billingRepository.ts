import { eq, inArray } from "drizzle-orm";
import { isAccountId } from "./accountRepository";
import { planStatus, type BillingRecord, type PlanStatus } from "./planStatus";
import { getPostgresDatabase } from "./postgres";
import { accounts, billingRecords } from "./postgresSchema";

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
    })
    .from(accounts)
    .leftJoin(billingRecords, eq(billingRecords.accountId, accounts.id));
}

type AccountPlanRow = Awaited<ReturnType<typeof selectAccountPlans>>[number];

function accountPlan(row: AccountPlanRow, realNow: Date): AccountPlan {
  const { plan, stripeStatus, firstChargeSucceeded } = row;
  const record = plan && stripeStatus && firstChargeSucceeded !== null
    ? {
      plan, stripeStatus, firstChargeSucceeded,
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
