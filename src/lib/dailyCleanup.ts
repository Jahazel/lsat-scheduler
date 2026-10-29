import { createHash, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { deleteOldDeletionListRows, finishMarkedDeletions } from "./accountDeletion";
import { getPostgresDatabase } from "./postgres";
import { deleteOldPendingSignups } from "./pendingSignupRepository";

// Compares digests so the length of the secret does not show in the timing.
export function isCronRequestAuthorized(authorization: string | null, secret: string | undefined) {
  if (!secret) return false;
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const given = createHash("sha256").update(authorization ?? "").digest();
  return timingSafeEqual(given, expected);
}

export async function runDailyCleanup() {
  const db = getPostgresDatabase();
  const deletions = await finishMarkedDeletions("/api/cron/daily-cleanup");
  const deletionListRemoved = await deleteOldDeletionListRows();
  const securityLog = await db.execute<{ removed: string }>(sql`select prune_security_log() as removed`);
  const pendingSignupsRemoved = await deleteOldPendingSignups();
  const resets = await db.execute(sql`delete from reset_tokens where expires_at < now()`);
  return {
    accountDeletionsFinished: deletions.deleted,
    accountDeletionsLeft: deletions.willFinish,
    deletionListRemoved,
    securityLogRemoved: Number(securityLog.rows[0]?.removed),
    pendingSignupsRemoved,
    resetTokensRemoved: resets.rowCount ?? 0,
  };
}
