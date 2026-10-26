import { and, eq, lte, sql } from "drizzle-orm";
import { countAction, limitOf } from "./actionLimits";
import { getPostgresDatabase } from "./postgres";
import { runningScans } from "./postgresSchema";
import { countScanSpend, isScanningOff, claimLimitAlert, replaceScanCount, type ScanKind, type SpendAlert } from "./scanSpending";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";
import { SCANNING_OFF } from "./screenshotUpload";

const PLACE_HELD_MS = 2 * 60 * 1000;
const SITE_PLACES = 5;
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { timeZone: SCHEDULE_TIMEZONE, month: "short", day: "numeric" });

export type ScanRefusal = {
  refused: "scanning-off" | "daily-limit" | "monthly-limit" | "still-reading" | "site-busy";
  message: string;
  retryAt?: Date;
  alert?: SpendAlert;
};
export type ScanPlace = { subject: string; kind: ScanKind; startedAt: Date; alert?: SpendAlert };

class Refused extends Error {
  constructor(readonly refusal: ScanRefusal, readonly atMoneyLimit = false) {
    super(refusal.message);
  }
}

const placeFreesAt = (startedAt: Date) => new Date(startedAt.getTime() + PLACE_HELD_MS);

export async function takeScanPlace(subject: string, kind: ScanKind, realNow: Date): Promise<ScanPlace | ScanRefusal> {
  try {
    return await getPostgresDatabase().transaction(async (transaction) => {
      if (await isScanningOff(transaction)) throw new Refused({ refused: "scanning-off", message: SCANNING_OFF });
      const day = await countAction("scanInDay", subject, realNow, transaction);
      const month = await countAction("scanInMonth", subject, realNow, transaction);
      if (!month.allowed) {
        throw new Refused({
          refused: "monthly-limit",
          message: `You've read ${limitOf("scanInMonth")} screenshots this month. You can scan again on ${MONTH_DAY.format(month.windowEnd)}.`,
          retryAt: month.windowEnd,
        });
      }
      if (!day.allowed) {
        throw new Refused({
          refused: "daily-limit",
          message: `You've read ${limitOf("scanInDay")} screenshots today. You can scan again tomorrow, after midnight Central time.`,
          retryAt: day.windowEnd,
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
      await transaction.insert(runningScans).values({ subject, startedAt: realNow });
      const spend = await countScanSpend(kind, realNow, transaction);
      if (!spend.added) throw new Refused({ refused: "scanning-off", message: SCANNING_OFF, retryAt: spend.monthEnd }, true);
      return { subject, kind, startedAt: realNow, alert: spend.alert };
    });
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    if (error.atMoneyLimit && await claimLimitAlert(realNow)) return { ...error.refusal, alert: "limit-reached" };
    return error.refusal;
  }
}

export async function freeScanPlace({ subject, kind, startedAt }: ScanPlace, realCostUsd: number | null) {
  await getPostgresDatabase().delete(runningScans).where(and(eq(runningScans.subject, subject), eq(runningScans.startedAt, startedAt)));
  if (realCostUsd !== null) await replaceScanCount(kind, startedAt, realCostUsd);
}
