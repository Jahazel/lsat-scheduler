import { and, eq, lte, sql } from "drizzle-orm";
import { countAction, limitOf } from "./actionLimits";
import { getPostgresDatabase } from "./postgres";
import { runningScans } from "./postgresSchema";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";

const PLACE_HELD_MS = 2 * 60 * 1000;
const SITE_PLACES = 5;
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { timeZone: SCHEDULE_TIMEZONE, month: "short", day: "numeric" });

export type ScanRefusal = {
  refused: "daily-limit" | "monthly-limit" | "still-reading" | "site-busy";
  message: string;
  retryAt: Date;
};
export type ScanPlace = { subject: string; startedAt: Date };

class Refused extends Error {
  constructor(readonly refusal: ScanRefusal) {
    super(refusal.message);
  }
}

const placeFreesAt = (startedAt: Date) => new Date(startedAt.getTime() + PLACE_HELD_MS);

/** Counts one scan in the day and the month and takes a running-scan place, or refuses and counts nothing. */
export async function takeScanPlace(subject: string, realNow: Date): Promise<ScanPlace | ScanRefusal> {
  try {
    return await getPostgresDatabase().transaction(async (transaction) => {
      const day = await countAction("scanInDay", subject, realNow, transaction);
      if (!day.allowed) {
        throw new Refused({
          refused: "daily-limit",
          message: `You've read ${limitOf("scanInDay")} screenshots today. You can scan again tomorrow, after midnight Central time.`,
          retryAt: day.windowEnd,
        });
      }
      const month = await countAction("scanInMonth", subject, realNow, transaction);
      if (!month.allowed) {
        throw new Refused({
          refused: "monthly-limit",
          message: `You've read ${limitOf("scanInMonth")} screenshots this month. You can scan again on ${MONTH_DAY.format(month.windowEnd)}.`,
          retryAt: month.windowEnd,
        });
      }

      await transaction.execute(sql`lock table ${runningScans} in share row exclusive mode`);
      await transaction.delete(runningScans).where(lte(runningScans.startedAt, new Date(realNow.getTime() - PLACE_HELD_MS)));
      const held = await transaction.select().from(runningScans);
      const own = held.find((place) => place.subject === subject);
      if (own) {
        throw new Refused({
          refused: "still-reading",
          message: "We're still reading your last screenshot. Wait a moment, then try this one.",
          retryAt: placeFreesAt(own.startedAt),
        });
      }
      if (held.length >= SITE_PLACES) {
        throw new Refused({
          refused: "site-busy",
          message: "Many students are scanning right now. Wait a moment, then try this one.",
          retryAt: placeFreesAt(new Date(Math.min(...held.map((place) => place.startedAt.getTime())))),
        });
      }
      const [place] = await transaction.insert(runningScans).values({ subject, startedAt: realNow }).returning();
      return place;
    });
  } catch (error) {
    if (error instanceof Refused) return error.refusal;
    throw error;
  }
}

export async function freeScanPlace({ subject, startedAt }: ScanPlace) {
  await getPostgresDatabase().delete(runningScans).where(and(eq(runningScans.subject, subject), eq(runningScans.startedAt, startedAt)));
}
