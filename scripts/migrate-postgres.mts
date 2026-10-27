import { applyPostgresMigrations, knownMigrationRefusal } from "../src/lib/postgresMigrations";
import { closePostgresDatabase } from "../src/lib/postgres";

try {
  await applyPostgresMigrations();
  process.stdout.write("Postgres migrations are up to date.\n");
} catch (error) {
  // Guard errors contain safe host names. Driver/parser errors can contain
  // credentials or SQL values, so print only the known guard and migration refusals.
  const message = error instanceof Error && error.message.startsWith("Refusing database host ")
    ? error.message
    : knownMigrationRefusal(error) ?? "Postgres migration failed. Check the connection setting and migration files.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await closePostgresDatabase();
}
