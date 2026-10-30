import { createHash, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { deleteOldDeletionListRows, finishMarkedDeletions } from "./accountDeletion";
import { signInToKeepYourAccount } from "./accountEmails";
import { markWarnedInactiveAccountsDeleting, warnNextInactiveAccount } from "./accountRepository";
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
  if (!configuredSiteUrl()) throw new Error("SITE_URL is not set, so this place cannot send inactive Account warnings.");
  const notSent: string[] = [];
  let sent = 0;
  for (;;) {
    const warned = await warnNextInactiveAccount(now, notSent, async (account) =>
      (await sendEmail(signInToKeepYourAccount(account.email, account.name))).sent);
    if (!warned) return { sent, notSent: notSent.length };
    if (warned.sent) sent += 1;
    else notSent.push(warned.id);
  }
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
