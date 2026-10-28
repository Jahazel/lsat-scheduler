import { createHash, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";

// Compares digests so the length of the secret does not show in the timing.
export function isCronRequestAuthorized(authorization: string | null, secret: string | undefined) {
  if (!secret) return false;
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const given = createHash("sha256").update(authorization ?? "").digest();
  return timingSafeEqual(given, expected);
}

export async function runDailyCleanup() {
  const db = getPostgresDatabase();
  const securityLog = await db.execute<{ removed: string }>(sql`select prune_security_log() as removed`);
  const signups = await db.execute(sql`delete from pending_signups where created_at < now() - interval '7 days'`);
  const resets = await db.execute(sql`delete from reset_tokens where expires_at < now()`);
  return {
    securityLogRemoved: Number(securityLog.rows[0]?.removed),
    pendingSignupsRemoved: signups.rowCount ?? 0,
    resetTokensRemoved: resets.rowCount ?? 0,
  };
}
