import { createHash, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { deleteOldDeletionListRows, finishMarkedDeletions } from "./accountDeletion";
import { signInToKeepYourAccount } from "./accountEmails";
import { claimInactiveWarnings, markWarnedInactiveAccountsDeleting, releaseInactiveWarning } from "./accountRepository";
import { configuredSiteUrl, sendEmail } from "./email";
import { getPostgresDatabase } from "./postgres";
import { deleteOldPendingSignups } from "./pendingSignupRepository";

// Compares digests so the length of the secret does not show in the timing.
export function isCronRequestAuthorized(authorization: string | null, secret: string | undefined) {
  if (!secret) return false;
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const given = createHash("sha256").update(authorization ?? "").digest();
  return timingSafeEqual(given, expected);
}

async function warnInactiveAccounts(now: Date) {
  if (!configuredSiteUrl()) throw new Error("SITE_URL is not set, so no inactive Account warning is claimed that could not be sent.");
  const counts = { sent: 0, notSent: 0 };
  for (const account of await claimInactiveWarnings(now)) {
    if ((await sendEmail(signInToKeepYourAccount(account.email, account.name))).sent) {
      counts.sent += 1;
    } else {
      counts.notSent += 1;
      await releaseInactiveWarning(account.id, now);
    }
  }
  return counts;
}

export async function runDailyCleanup() {
  const db = getPostgresDatabase();
  const now = new Date();
  const inactiveAccountsMarked = await markWarnedInactiveAccountsDeleting(now);
  const deletions = await finishMarkedDeletions("/api/cron/daily-cleanup");
  const deletionListRemoved = await deleteOldDeletionListRows();
  const securityLog = await db.execute<{ removed: string }>(sql`select prune_security_log() as removed`);
  const pendingSignupsRemoved = await deleteOldPendingSignups();
  const resets = await db.execute(sql`delete from reset_tokens where expires_at < now()`);
  const warnings = await warnInactiveAccounts(now);
  return {
    accountDeletionsFinished: deletions.deleted,
    accountDeletionsLeft: deletions.willFinish,
    inactiveAccountsMarked,
    inactiveWarningsSent: warnings.sent,
    inactiveWarningsNotSent: warnings.notSent,
    deletionListRemoved,
    securityLogRemoved: Number(securityLog.rows[0]?.removed),
    pendingSignupsRemoved,
    resetTokensRemoved: resets.rowCount ?? 0,
  };
}
