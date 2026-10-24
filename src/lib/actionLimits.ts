import { lte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getPostgresDatabase } from "./postgres";
import { actionCounters } from "./postgresSchema";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";

const ZONE_WITHOUT_A_REPEATED_HOUR = "UTC";

const WINDOWS = {
  hour: { unit: "hour", zone: ZONE_WITHOUT_A_REPEATED_HOUR },
  day: { unit: "day", zone: SCHEDULE_TIMEZONE },
} as const;

const LIMITS = {
  leadCapture: { max: 5, window: WINDOWS.hour },
  analyticsSnapshotSave: { max: 5, window: WINDOWS.day },
} as const;

export type LimitedAction = keyof typeof LIMITS;
export type LimitResult = { allowed: true } | { allowed: false; windowEnd: Date };

/** Counts one action for one subject in its fixed window. `realNow` must be the real clock, never a simulated date. */
export async function countAction(action: LimitedAction, subject: string, realNow: Date): Promise<LimitResult> {
  const { max, window: { unit, zone } } = LIMITS[action];
  const db = getPostgresDatabase();
  const localStart = sql`date_trunc(${unit}, ${realNow.toISOString()}::timestamptz at time zone ${zone})`;
  const [counted] = await db.insert(actionCounters).values({
    action,
    subject,
    windowStart: sql`${localStart} at time zone ${zone}`,
    windowEnd: sql`(${localStart} + ${`1 ${unit}`}::interval) at time zone ${zone}`,
    count: 1,
  }).onConflictDoUpdate({
    target: [actionCounters.action, actionCounters.subject, actionCounters.windowStart],
    set: { count: sql`${actionCounters.count} + 1` },
  }).returning({ count: actionCounters.count, windowEnd: actionCounters.windowEnd });
  await db.delete(actionCounters).where(lte(actionCounters.windowEnd, realNow));
  return counted.count <= max ? { allowed: true } : { allowed: false, windowEnd: counted.windowEnd };
}

/** The only reader of the client IP address. Vercel overwrites this header, so a client cannot choose it. */
export async function clientIpAddress() {
  return (await headers()).get("x-vercel-forwarded-for") ?? "unknown";
}
