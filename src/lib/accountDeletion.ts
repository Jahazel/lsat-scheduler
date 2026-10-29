import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";
import { accounts, deletionList } from "./postgresSchema";
import { emailHash, recordUnexpectedFailure, type SecurityLogRoute } from "./securityLog";

export type DeletionOutcome = "deleted" | "willFinish";

export async function finishDeletion(id: string, route: SecurityLogRoute): Promise<DeletionOutcome> {
  try {
    await getPostgresDatabase().transaction(async (tx) => {
      const [deleted] = await tx.delete(accounts)
        .where(and(eq(accounts.id, id), isNotNull(accounts.deletingSince)))
        .returning({ email: accounts.email });
      if (deleted) await tx.insert(deletionList).values({ accountId: id, emailHash: emailHash(deleted.email) }).onConflictDoNothing();
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
  const removed = await getPostgresDatabase()
    .delete(deletionList)
    .where(sql`${deletionList.deletedOn} < current_date - 30`)
    .returning({ accountId: deletionList.accountId });
  return removed.length;
}
