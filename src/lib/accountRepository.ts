import { and, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getPostgresDatabase } from "./postgres";
import type { CurrentPasswordProof } from "./passwordAccount";
import { accounts, pendingSignups } from "./postgresSchema";

const accountIdSchema = z.guid().brand<"AccountId">();
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

/** Returns false when the password changed after the check. */
export async function deletePasswordAccount(proof: CurrentPasswordProof) {
  const deleted = await getPostgresDatabase().delete(accounts).where(passwordUnchangedSinceProof(proof)).returning({ id: accounts.id });
  return deleted.length === 1;
}

export async function deleteGoogleAccount(id: AccountId) {
  await getPostgresDatabase().delete(accounts).where(and(eq(accounts.id, id), isNotNull(accounts.googleId)));
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
