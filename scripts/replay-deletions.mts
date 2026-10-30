import { createPostgresConnection, requirePostgresScriptTarget } from "../src/lib/postgres";
import { replayDeletionList } from "./deletionReplay";
import { requireLocalDatabase } from "./localDatabaseGuard.mjs";

const connections: ReturnType<typeof createPostgresConnection>[] = [];
try {
  requirePostgresScriptTarget();
  const listSetting = process.env.DELETION_LIST_URL;
  requireLocalDatabase(listSetting);
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not set.");
  const list = createPostgresConnection({ connectionString: listSetting });
  connections.push(list);
  const restored = createPostgresConnection();
  connections.push(restored);
  const counts = await replayDeletionList({ list: list.db, restored: restored.db });
  process.stdout.write(`Deletion list rows: ${counts.listed}. Restored Accounts deleted: ${counts.deleted}.\n`);
} catch (error) {
  const message = error instanceof Error && (error.message.startsWith("Refusing database host ")
    || error.message === "AUTH_SECRET is not set."
    || error.message === "Remote Postgres requires sslmode=verify-full.")
    ? error.message
    : "Deletion replay failed. Check both connection settings and the database permissions, then run it again.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  for (const connection of connections) {
    try {
      await connection.close();
    } catch {
      process.stderr.write("Deletion replay connection cleanup failed.\n");
      process.exitCode = 1;
    }
  }
}
