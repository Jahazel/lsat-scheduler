import { closePostgresDatabase, getPostgresDatabase, getPostgresHosts } from "../src/lib/postgres";
import { applyReleaseMigrations, publicFailureMessage, requireReleaseTarget } from "./releaseMigrations";

try {
  const target = requireReleaseTarget(process.env, getPostgresHosts);
  const { before, after } = await applyReleaseMigrations(getPostgresDatabase());
  process.stdout.write(`Target: ${target}. Journal rows before: ${before}. After: ${after}. New migrations: ${after - before}.\n`);
} catch (error) {
  process.stderr.write(`${publicFailureMessage(error)}\n`);
  process.exitCode = 1;
} finally {
  await closePostgresDatabase();
}
