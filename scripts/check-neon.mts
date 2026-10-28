import { createPostgresConnection, requirePostgresScriptTarget } from "../src/lib/postgres";
import { checkPostgresFoundation } from "./postgresFoundationChecks";

let connection: ReturnType<typeof createPostgresConnection> | undefined;
try {
  requirePostgresScriptTarget();
  connection = createPostgresConnection();
  const messages = await checkPostgresFoundation(connection);
  await connection.close();
  connection = undefined;
  process.stdout.write(`${messages.join("\n")}\n`);
} catch (error) {
  const message = error instanceof Error && (error.message.startsWith("Refusing database host ")
    || error.message === "Remote Postgres requires sslmode=verify-full.")
    ? error.message : "Database foundation check failed.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  try {
    await connection?.close();
  } catch {
    process.stderr.write("Database foundation connection cleanup failed.\n");
    process.exitCode = 1;
  }
}
