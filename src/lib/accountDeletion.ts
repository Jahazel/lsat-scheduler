import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";
import { accounts } from "./postgresSchema";
import { emailHash, recordUnexpectedFailure, type SecurityLogRoute } from "./securityLog";

export async function finishAccountDeletion(id: string) {
  return getPostgresDatabase().transaction(async (tx) => {
    const [deleted] = await tx.delete(accounts)
      .where(and(eq(accounts.id, id), isNotNull(accounts.deletingSince)))
      .returning({ id: accounts.id, email: accounts.email });
    if (!deleted) return false;
    await tx.execute(sql`insert into deletion_list (account_id, email_hash) values (${deleted.id}, ${emailHash(deleted.email)})`);
    return true;
  });
}

export async function attemptAccountDeletion(id: string, route: SecurityLogRoute) {
  try {
    await finishAccountDeletion(id);
    return "deleted";
  } catch (error) {
    await recordUnexpectedFailure(route, error);
    return "will-finish";
  }
}

export async function finishMarkedDeletions(route: SecurityLogRoute) {
  const marked = await getPostgresDatabase().select({ id: accounts.id }).from(accounts).where(isNotNull(accounts.deletingSince));
  let finished = 0;
  let failed = 0;
  for (const { id } of marked) {
    try {
      if (await finishAccountDeletion(id)) finished += 1;
    } catch (error) {
      failed += 1;
      await recordUnexpectedFailure(route, error);
    }
  }
  return { finished, failed };
}

export async function deleteOldDeletionListRows() {
  const removed = await getPostgresDatabase().execute(sql`delete from deletion_list where deleted_at < now() - interval '30 days'`);
  return removed.rowCount ?? 0;
}
