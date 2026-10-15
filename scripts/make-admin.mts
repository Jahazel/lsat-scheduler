import { eq, sql } from "drizzle-orm";
import { closePostgresDatabase, getPostgresDatabase, requirePostgresScriptTarget } from "../src/lib/postgres";
import { accounts } from "../src/lib/postgresSchema";

class UserRefusalError extends Error {}

try {
  const email = process.argv[2];
  if (process.argv.length !== 3 || !email?.trim()) {
    throw new UserRefusalError("Usage: npm run make-admin -- <email>");
  }

  const host = requirePostgresScriptTarget();
  const displayEmail = email.trim().toLowerCase();
  const status = await getPostgresDatabase().transaction(async (transaction) => {
    const [account] = await transaction.select({ id: accounts.id, role: accounts.role })
      .from(accounts).where(eq(accounts.email, sql`normalized_email(${email})`)).for("update");
    if (!account) throw new UserRefusalError(`No account found for ${displayEmail} on ${host}`);
    if (account.role === "admin") return "already-admin";

    const [updated] = await transaction.update(accounts).set({ role: "admin" })
      .where(eq(accounts.id, account.id)).returning({ id: accounts.id });
    if (!updated) throw new UserRefusalError(`No account updated for ${displayEmail} on ${host}`);
    return "promoted";
  });

  process.stdout.write(status === "already-admin"
    ? `${displayEmail} is already an admin on ${host}.\n`
    : `Made ${displayEmail} an admin on ${host}.\n`);
  process.stdout.write("Sign out and back in before the admin controls appear.\n");
} catch (error) {
  const message = error instanceof UserRefusalError
    || (error instanceof Error && error.message.startsWith("Refusing database host "))
    ? error.message
    : "Admin promotion failed. Check the connection setting and database permissions.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await closePostgresDatabase();
}
