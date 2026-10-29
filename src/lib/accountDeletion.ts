import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";
import { accounts, deletionList } from "./postgresSchema";
import { emailHash, recordUnexpectedFailure, type SecurityLogRoute } from "./securityLog";

export type DeletionOutcome = "deleted" | "willFinish";
export type DeletingLoginRefusal = "accountDeleted" | "deletionWillFinish";

export async function finishDeletionOnSignIn(id: string, route: SecurityLogRoute): Promise<DeletingLoginRefusal> {
  return (await finishDeletion(id, route)) === "deleted" ? "accountDeleted" : "deletionWillFinish";
}

export async function finishDeletion(id: string, route: SecurityLogRoute): Promise<DeletionOutcome> {
  try {
    await getPostgresDatabase().transaction(async (tx) => {
      const [deleted] = await tx.delete(accounts)
        .where(and(eq(accounts.id, id), isNotNull(accounts.deletingSince)))
        .returning({ email: accounts.email });
      if (deleted) {
        // Drizzle's insert names every column, and the app role may write only these two.
        await tx.execute(sql`
          insert into ${deletionList} (account_id, email_hash) values (${id}, ${emailHash(deleted.email)}) on conflict do nothing
        `);
      }
    });
    return "deleted";
  } catch (error) {
    await recordUnexpectedFailure(route, error);
    return "willFinish";
  }
}

export async function finishMarkedDeletions(route: SecurityLogRoute) {
  const marked = await getPostgresDatabase()
    .select({ id: accounts.id })
    .from(accounts)
    .where(isNotNull(accounts.deletingSince))
    .orderBy(asc(accounts.deletingSince));
  const counts: Record<DeletionOutcome, number> = { deleted: 0, willFinish: 0 };
  for (const { id } of marked) counts[await finishDeletion(id, route)] += 1;
  return counts;
}

export async function deleteOldDeletionListRows() {
  const pruned = await getPostgresDatabase().execute<{ removed: string }>(sql`select prune_deletion_list() as removed`);
  return Number(pruned.rows[0]?.removed);
}
