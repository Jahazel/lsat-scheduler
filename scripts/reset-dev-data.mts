import { closePostgresDatabase, getPostgresDatabase, requirePostgresScriptTarget } from "../src/lib/postgres";
import { activityCheckIns, analyticsSnapshots, students, weeklySchedules } from "../src/lib/postgresSchema";

const tables = { activityCheckIns, weeklySchedules, analyticsSnapshots, students };

class UserRefusalError extends Error {}

try {
  if (process.env.NODE_ENV === "production") {
    throw new UserRefusalError("Refusing to reset data with NODE_ENV=production.");
  }
  const host = requirePostgresScriptTarget();
  if (!process.argv.includes("--yes")) {
    throw new UserRefusalError(`This deletes all students, Analytics snapshots, Weekly schedules, and Activity check-ins on ${host}. Re-run with --yes to confirm.`);
  }

  const deleted = await getPostgresDatabase().transaction(async (transaction) => {
    const counts: Record<string, number> = {};
    for (const [name, table] of Object.entries(tables)) {
      counts[name] = (await transaction.delete(table).returning({ id: table.id })).length;
    }
    return counts;
  });
  process.stdout.write(`Reset dev data on ${host}: ${JSON.stringify(deleted)}\n`);
} catch (error) {
  const message = error instanceof UserRefusalError
    || (error instanceof Error && error.message.startsWith("Refusing database host "))
    ? error.message
    : "Reset failed. Check the connection setting and database permissions.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await closePostgresDatabase();
}
