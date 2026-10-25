import { lt, sql } from "drizzle-orm";
import { getPostgresDatabase, type PostgresTransaction } from "./postgres";
import { scanSettings, scanSpending } from "./postgresSchema";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";

export type ScanKind = "analytics" | "practice-test-section";
export type SpendAlert = "spend-warning" | "limit-reached";

const COUNTED_USD: Record<ScanKind, string> = { analytics: "0.02", "practice-test-section": "0.03" };
const WARNING_SHARE = "0.8";
const PING_URL_SETTINGS: Record<SpendAlert, string> = {
  "spend-warning": "SCAN_SPEND_WARNING_PING_URL",
  "limit-reached": "SCAN_LIMIT_REACHED_PING_URL",
};

const localMonthStart = (realNow: Date) => sql`date_trunc('month', ${realNow.toISOString()}::timestamptz at time zone ${SCHEDULE_TIMEZONE})`;
const monthStartOf = (realNow: Date) => sql`${localMonthStart(realNow)} at time zone ${SCHEDULE_TIMEZONE}`;

export async function isScanningOff(transaction: PostgresTransaction) {
  const [settings] = await transaction.select({ scanningOff: scanSettings.scanningOff }).from(scanSettings);
  if (!settings) console.error(JSON.stringify({ event: "scan_settings_missing" }));
  return settings?.scanningOff ?? true;
}

export async function countScanSpend(kind: ScanKind, realNow: Date, transaction: PostgresTransaction) {
  const monthStart = monthStartOf(realNow);
  const count = sql`${COUNTED_USD[kind]}::numeric`;
  const limit = sql`(select monthly_limit_usd from ${scanSettings})`;
  await transaction.insert(scanSpending).values({ monthStart, totalUsd: 0 }).onConflictDoNothing();
  await transaction.delete(scanSpending).where(lt(scanSpending.monthStart, monthStart));
  const result = await transaction.execute<{ send_warning: boolean }>(sql`
    with before as (select warning_sent_at from ${scanSpending} where month_start = ${monthStart} for update)
    update ${scanSpending} set
      total_usd = total_usd + ${count},
      warning_sent_at = coalesce(${scanSpending}.warning_sent_at, case when total_usd + ${count} >= ${limit} * ${WARNING_SHARE}::numeric then ${realNow.toISOString()}::timestamptz end)
    from before
    where month_start = ${monthStart} and total_usd + ${count} <= ${limit}
    returning before.warning_sent_at is null and ${scanSpending}.warning_sent_at is not null as send_warning
  `);
  const [counted] = result.rows;
  if (!counted) {
    const monthEnd = await transaction.execute<{ seconds: number }>(
      sql`select extract(epoch from (${localMonthStart(realNow)} + interval '1 month') at time zone ${SCHEDULE_TIMEZONE})::float8 as seconds`,
    );
    return { added: false, monthEnd: new Date(monthEnd.rows[0].seconds * 1000) } as const;
  }
  return { added: true, alert: counted.send_warning ? "spend-warning" : undefined } as const;
}

export async function claimLimitAlert(realNow: Date) {
  const marked = await getPostgresDatabase().insert(scanSpending)
    .values({ monthStart: monthStartOf(realNow), totalUsd: 0, limitAlertSentAt: realNow })
    .onConflictDoUpdate({
      target: scanSpending.monthStart,
      set: { limitAlertSentAt: realNow },
      setWhere: sql`${scanSpending.limitAlertSentAt} is null`,
    })
    .returning({ monthStart: scanSpending.monthStart });
  return marked.length > 0;
}

export async function replaceScanCount(kind: ScanKind, startedAt: Date, realCostUsd: number) {
  await getPostgresDatabase().execute(sql`
    update ${scanSpending} set total_usd = greatest(total_usd - ${COUNTED_USD[kind]}::numeric + ${realCostUsd.toFixed(8)}::numeric, 0)
    where month_start = ${monthStartOf(startedAt)}
  `);
}

async function pingFailSignal(alert: SpendAlert) {
  const setting = PING_URL_SETTINGS[alert];
  const pingUrl = process.env[setting];
  if (!pingUrl?.startsWith("https://")) {
    console.error(JSON.stringify({ event: "spend_alert_not_configured", alert, setting }));
    return false;
  }
  try {
    const response = await fetch(`${pingUrl}/fail`, { method: "POST", signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`Healthchecks.io replied ${response.status}`);
    return true;
  } catch (error) {
    console.error(JSON.stringify({ event: "spend_alert_not_sent", alert, error: error instanceof Error ? error.name : "unknown" }));
    return false;
  }
}

export async function trySendSpendAlert(alert: SpendAlert, realNow: Date) {
  if (await pingFailSignal(alert)) return;
  await getPostgresDatabase().update(scanSpending)
    .set(alert === "spend-warning" ? { warningSentAt: null } : { limitAlertSentAt: null })
    .where(sql`${scanSpending.monthStart} = ${monthStartOf(realNow)}`)
    .catch((error: unknown) => {
      console.error(JSON.stringify({ event: "spend_alert_not_released", alert, error: error instanceof Error ? error.name : "unknown" }));
    });
}
