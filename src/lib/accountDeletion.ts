import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";
import { accounts } from "./postgresSchema";
import { emailHash, recordSecurityEvent, recordUnexpectedFailure, type SecurityLogRoute } from "./securityLog";

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

export async function attemptAccountDeletion(id: string, route: SecurityLogRoute, ipAddress?: string): Promise<"deleted" | "will-finish" | "nothingMarked"> {
  let result: "deleted" | "will-finish";
  try {
    if (!(await finishAccountDeletion(id))) return "nothingMarked";
    result = "deleted";
  } catch (error) {
    await recordUnexpectedFailure(route, error);
    result = "will-finish";
  }
  await recordSecurityEvent({ event: "account_deletion", result, route, who: { account: id }, ipAddress });
  return result;
}

export async function finishMarkedDeletions(route: SecurityLogRoute) {
  const marked = await getPostgresDatabase().select({ id: accounts.id }).from(accounts).where(isNotNull(accounts.deletingSince));
  const results = [];
  for (const { id } of marked) results.push(await attemptAccountDeletion(id, route));
  return { finished: results.filter((result) => result === "deleted").length, failed: results.filter((result) => result === "will-finish").length };
}

export async function deleteOldDeletionListRows() {
  const removed = await getPostgresDatabase().execute(sql`delete from deletion_list where deleted_at < now() - interval '30 days'`);
  return removed.rowCount ?? 0;
}
