import { inArray, isNotNull } from "drizzle-orm";
import { emailHash } from "../src/lib/emailHash";
import type { createPostgresConnection } from "../src/lib/postgres";
import { accounts, deletionList } from "../src/lib/postgresSchema";

type Database = ReturnType<typeof createPostgresConnection>["db"];

export async function replayDeletionList({ list, restored }: { list: Database; restored: Database }) {
  const rows = await list.select().from(deletionList);
  const marked = await list.select({ id: accounts.id }).from(accounts).where(isNotNull(accounts.deletingSince));
  const listedIds = new Set([...rows.map((row) => row.accountId), ...marked.map((account) => account.id)]);
  const listedHashes = new Set(rows.map((row) => row.emailHash));
  return restored.transaction(async (tx) => {
    const matched = (await tx.select({ id: accounts.id, email: accounts.email }).from(accounts).for("update"))
      .map(({ id, email }) => ({ accountId: id, emailHash: emailHash(email) }))
      .filter((row) => listedIds.has(row.accountId) || listedHashes.has(row.emailHash));
    const missing = [...rows, ...matched];
    if (missing.length) await tx.insert(deletionList).values(missing).onConflictDoNothing();
    const deleted = matched.length
      ? await tx.delete(accounts).where(inArray(accounts.id, matched.map((row) => row.accountId))).returning({ id: accounts.id })
      : [];
    return { listed: rows.length, deleted: deleted.length };
  });
}
