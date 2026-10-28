import { and, eq, gt, sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";
import { accounts, pendingSignups } from "./postgresSchema";

const HOUR_MS = 60 * 60 * 1000;
export const VERIFICATION_LINK_HOURS = 24;
const PENDING_SIGNUP_DAYS = 7;

const stillPending = (realNow: Date) => gt(pendingSignups.createdAt, new Date(realNow.getTime() - PENDING_SIGNUP_DAYS * 24 * HOUR_MS));

export async function savePendingSignup(
  { email, name, passwordHash, tokenHash }: { email: string; name: string; passwordHash: string; tokenHash: string },
  realNow: Date,
) {
  const replacement = {
    name,
    passwordHash,
    tokenHash,
    tokenExpiresAt: new Date(realNow.getTime() + VERIFICATION_LINK_HOURS * HOUR_MS),
    createdAt: realNow,
  };
  await getPostgresDatabase().insert(pendingSignups).values({ email, ...replacement })
    .onConflictDoUpdate({ target: pendingSignups.email, set: replacement });
}

export async function deleteOldPendingSignups() {
  const removed = await getPostgresDatabase().execute(
    sql`delete from ${pendingSignups} where created_at < now() - make_interval(days => ${PENDING_SIGNUP_DAYS})`,
  );
  return removed.rowCount ?? 0;
}

export async function findPendingSignup(email: string, realNow: Date) {
  const [pending] = await getPostgresDatabase()
    .select({ name: pendingSignups.name, passwordHash: pendingSignups.passwordHash })
    .from(pendingSignups)
    .where(and(eq(pendingSignups.email, email), stillPending(realNow)));
  return pending ?? null;
}

/** Returns false when a newer signup replaced this one after it was read. */
export async function replaceVerificationToken(
  { email, passwordHash, tokenHash }: { email: string; passwordHash: string; tokenHash: string },
  realNow: Date,
) {
  const replaced = await getPostgresDatabase().update(pendingSignups)
    .set({ tokenHash, tokenExpiresAt: new Date(realNow.getTime() + VERIFICATION_LINK_HOURS * HOUR_MS) })
    .where(and(eq(pendingSignups.email, email), eq(pendingSignups.passwordHash, passwordHash), stillPending(realNow)))
    .returning({ email: pendingSignups.email });
  return replaced.length > 0;
}

export type VerificationResult = "verified" | "accountExists" | "linkDoesNotWork";

export async function createAccountFromPendingSignup(tokenHash: string, realNow: Date): Promise<VerificationResult> {
  return getPostgresDatabase().transaction(async (tx) => {
    const [pending] = await tx.delete(pendingSignups)
      .where(and(eq(pendingSignups.tokenHash, tokenHash), gt(pendingSignups.tokenExpiresAt, realNow), stillPending(realNow)))
      .returning();
    if (!pending) return "linkDoesNotWork";
    const created = await tx.execute(sql`
      insert into ${accounts} (email, name, password_hash) values (${pending.email}, ${pending.name}, ${pending.passwordHash})
      on conflict do nothing returning id
    `);
    return created.rows.length ? "verified" : "accountExists";
  });
}
