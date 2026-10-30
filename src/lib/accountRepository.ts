import { and, eq, isNotNull, isNull, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getPostgresDatabase } from "./postgres";
import type { CurrentPasswordProof } from "./passwordAccount";
import { accounts, pendingSignups } from "./postgresSchema";

export const INACTIVE_YEARS = 2;
export const INACTIVE_WARNING_DAYS = 30;

export const accountIdSchema = z.guid().brand<"AccountId">();
export type AccountId = z.infer<typeof accountIdSchema>;

export function isAccountId(id: string | null | undefined): id is AccountId {
  return accountIdSchema.safeParse(id).success;
}

const publicColumns = {
  id: accounts.id,
  email: accounts.email,
  name: accounts.name,
  role: accounts.role,
  simulatedDate: accounts.simulatedDate,
  disabledAt: accounts.disabledAt,
  deletingSince: accounts.deletingSince,
  sessionVersion: accounts.sessionVersion,
};

export async function findAccountById(id: string | undefined) {
  if (!isAccountId(id)) return null;
  const [account] = await getPostgresDatabase().select(publicColumns).from(accounts).where(eq(accounts.id, id));
  return account ?? null;
}

export async function findAccountByEmail(email: string) {
  const [account] = await getPostgresDatabase()
    .select(publicColumns)
    .from(accounts)
    .where(eq(accounts.email, sql`normalized_email(${email})`));
  return account ?? null;
}

export async function signInMethodForEmail(email: string) {
  const [account] = await getPostgresDatabase()
    .select({ googleId: accounts.googleId })
    .from(accounts)
    .where(eq(accounts.email, sql`normalized_email(${email})`));
  if (!account) return null;
  return account.googleId === null ? "password" : "google";
}

export async function findPasswordAccountByEmail(email: string) {
  const [account] = await getPostgresDatabase()
    .select({ ...publicColumns, passwordHash: accounts.passwordHash })
    .from(accounts)
    .where(eq(accounts.email, sql`normalized_email(${email})`));
  return account?.passwordHash ? { ...account, passwordHash: account.passwordHash } : null;
}

export async function findPasswordAccountById(id: AccountId) {
  const [account] = await getPostgresDatabase()
    .select({ id: accounts.id, email: accounts.email, passwordHash: accounts.passwordHash })
    .from(accounts)
    .where(eq(accounts.id, id));
  return account?.passwordHash ? { id, email: account.email, passwordHash: account.passwordHash } : null;
}

const passwordUnchangedSinceProof = (proof: CurrentPasswordProof) => and(eq(accounts.id, proof.id), eq(accounts.passwordHash, proof.passwordHash));

/** Sets the new password and signs out every device. Returns false when the password changed after the check. */
export async function replacePasswordHash(proof: CurrentPasswordProof, newHash: string) {
  const changed = await getPostgresDatabase()
    .update(accounts)
    .set({ passwordHash: newHash, sessionVersion: sql`${accounts.sessionVersion} + 1` })
    .where(passwordUnchangedSinceProof(proof))
    .returning({ id: accounts.id });
  return changed.length === 1;
}

const markDeleting = (where: SQL | undefined) => getPostgresDatabase()
  .update(accounts)
  .set({ deletingSince: sql`coalesce(${accounts.deletingSince}, now())` })
  .where(where)
  .returning({ id: accounts.id });

export async function markPasswordAccountDeleting(proof: CurrentPasswordProof) {
  return (await markDeleting(passwordUnchangedSinceProof(proof))).length === 1;
}

export async function markGoogleAccountDeleting(id: AccountId) {
  return (await markDeleting(and(eq(accounts.id, id), isNotNull(accounts.googleId)))).length === 1;
}

export async function findAccountByGoogleId(googleId: string) {
  const [account] = await getPostgresDatabase().select(publicColumns).from(accounts).where(eq(accounts.googleId, googleId));
  return account ?? null;
}

const createdAccount = z.object({ id: accountIdSchema, role: z.enum(accounts.role.enumValues) });

/**
 * Returns null when another Account already has this email or Google ID.
 * Deletes any pending signup for the email first, in the lock order that
 * createAccountFromPendingSignup uses, so a verification press at the same moment cannot deadlock with it.
 */
export async function createAccount({ email, name, googleId }: { email: string; name: string; googleId: string }) {
  return getPostgresDatabase().transaction(async (tx) => {
    await tx.delete(pendingSignups).where(eq(pendingSignups.email, sql`normalized_email(${email})`));
    const result = await tx.execute(sql`
      insert into ${accounts} (email, name, google_id) values (${email}, ${name}, ${googleId})
      on conflict do nothing returning id, role
    `);
    return result.rows[0] ? createdAccount.parse(result.rows[0]) : null;
  });
}

export async function endAllSessions(id: AccountId) {
  await getPostgresDatabase()
    .update(accounts)
    .set({ sessionVersion: sql`${accounts.sessionVersion} + 1` })
    .where(eq(accounts.id, id));
}

/** Records a successful sign-in, which also cancels an inactive Account warning. */
export async function recordSignIn(id: string, at: Date) {
  await getPostgresDatabase()
    .update(accounts)
    .set({ lastSignedInAt: at, inactiveWarningSentAt: null })
    .where(and(eq(accounts.id, id), isNull(accounts.deletingSince)));
}

/** Sets the warning time on each Account due a warning and returns them, so that two runs cannot both warn one Account. */
export async function claimInactiveWarnings(now: Date) {
  const signedInBefore = new Date(now);
  signedInBefore.setUTCFullYear(signedInBefore.getUTCFullYear() - INACTIVE_YEARS);
  return getPostgresDatabase()
    .update(accounts)
    .set({ inactiveWarningSentAt: now })
    .where(and(lte(accounts.lastSignedInAt, signedInBefore), isNull(accounts.inactiveWarningSentAt), isNull(accounts.deletingSince)))
    .returning({ id: accounts.id, email: accounts.email, name: accounts.name });
}

/** Lets the next daily run warn the Account again when this run's email was not sent. */
export async function releaseInactiveWarning(id: string, claimedAt: Date) {
  await getPostgresDatabase()
    .update(accounts)
    .set({ inactiveWarningSentAt: null })
    .where(and(eq(accounts.id, id), eq(accounts.inactiveWarningSentAt, claimedAt)));
}

export async function markWarnedInactiveAccountsDeleting(now: Date) {
  const warnedBefore = new Date(now.getTime() - INACTIVE_WARNING_DAYS * 24 * 60 * 60 * 1000);
  return (await markDeleting(lte(accounts.inactiveWarningSentAt, warnedBefore))).length;
}
