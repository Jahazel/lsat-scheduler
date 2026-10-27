import { and, eq, lte, sql } from "drizzle-orm";
import { getPostgresDatabase, type PostgresTransaction } from "./postgres";
import { actionCounters } from "./postgresSchema";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";

const ZONE_WITHOUT_A_REPEATED_HOUR = "UTC";

const WINDOWS = {
  quarterHour: { length: "15 minutes", zone: ZONE_WITHOUT_A_REPEATED_HOUR },
  hour: { length: "1 hour", zone: ZONE_WITHOUT_A_REPEATED_HOUR },
  day: { length: "1 day", zone: SCHEDULE_TIMEZONE },
  month: { length: "1 month", zone: SCHEDULE_TIMEZONE },
} as const;

const LIMITS = {
  leadCapture: { max: 5, window: WINDOWS.hour },
  analyticsSnapshotSave: { max: 5, window: WINDOWS.day },
  scanInDay: { max: 10, window: WINDOWS.day },
  scanInMonth: { max: 40, window: WINDOWS.month },
  signupEmailInHour: { max: 3, window: WINDOWS.hour },
  signupEmailInDay: { max: 5, window: WINDOWS.day },
  signupFromIpAddress: { max: 10, window: WINDOWS.hour },
  failedLoginForEmail: { max: 10, window: WINDOWS.quarterHour },
  failedLoginFromIpAddress: { max: 50, window: WINDOWS.hour },
} as const;

function windowAt(action: LimitedAction, realNow: Date) {
  const { length, zone } = LIMITS[action].window;
  const local = sql`${realNow.toISOString()}::timestamptz at time zone ${zone}`;
  // date_bin cannot step by months.
  const localStart = length === "1 month"
    ? sql`date_trunc('month', ${local})`
    : sql`date_bin(${length}::interval, ${local}, timestamp '2000-01-01')`;
  return {
    start: sql`${localStart} at time zone ${zone}`,
    end: sql`(${localStart} + ${length}::interval) at time zone ${zone}`,
  };
}

export type LimitedAction = keyof typeof LIMITS;
export const limitOf = (action: LimitedAction) => LIMITS[action].max;
export type LimitResult = { allowed: true } | { allowed: false; windowEnd: Date };

/**
 * Counts one action for one subject in its fixed window. `realNow` must be the real clock, never a simulated date.
 * Pass the caller's transaction when the counted action writes, so a failed write gives the count back.
 */
export async function countAction(
  action: LimitedAction,
  subject: string,
  realNow: Date,
  db: ReturnType<typeof getPostgresDatabase> | PostgresTransaction = getPostgresDatabase(),
): Promise<LimitResult> {
  const window = windowAt(action, realNow);
  const [counted] = await db.insert(actionCounters).values({
    action,
    subject,
    windowStart: window.start,
    windowEnd: window.end,
    count: 1,
  }).onConflictDoUpdate({
    target: [actionCounters.action, actionCounters.subject, actionCounters.windowStart],
    set: { count: sql`${actionCounters.count} + 1` },
  }).returning({ count: actionCounters.count, windowEnd: actionCounters.windowEnd });
  await db.execute(sql`delete from ${actionCounters} where ctid in (
    select ctid from ${actionCounters} where ${lte(actionCounters.windowEnd, realNow)} for update skip locked
  )`);
  return counted.count <= LIMITS[action].max ? { allowed: true } : { allowed: false, windowEnd: counted.windowEnd };
}

/** Says whether earlier counts in the current window already reached the limit. It counts nothing. */
export async function limitReached(action: LimitedAction, subject: string, realNow: Date) {
  const [counted] = await getPostgresDatabase().select({ count: actionCounters.count }).from(actionCounters).where(and(
    eq(actionCounters.action, action),
    eq(actionCounters.subject, subject),
    eq(actionCounters.windowStart, windowAt(action, realNow).start),
  ));
  return (counted?.count ?? 0) >= LIMITS[action].max;
}
