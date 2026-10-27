import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import copyDatabaseHosts from "./copyDatabaseHosts.json";
import productionDatabaseHosts from "./productionDatabaseHosts.json";
import { getDatabaseHost } from "./localDatabaseGuard.mjs";
import { publicFailureMessage, requireReleaseTarget } from "./releaseMigrations";

const exec = promisify(execFile);
const [copyHost] = copyDatabaseHosts;
const [productionHost] = productionDatabaseHosts;
const setting = (host: string) => `postgresql://migrator:secret-password@${host}/neondb?sslmode=verify-full`;
const check = ({ DATABASE_URL, ...environment }: Record<string, string>) =>
  requireReleaseTarget(environment, () => getDatabaseHost(DATABASE_URL));

it("accepts a copy host for the copy and a production host for production", () => {
  expect(check({ GITHUB_ACTIONS: "true", MIGRATION_TARGET: "copy", DATABASE_URL: setting(copyHost) })).toBe("copy");
  expect(check({ GITHUB_ACTIONS: "true", MIGRATION_TARGET: "production", DATABASE_URL: setting(`${productionHost}:5432`) }))
    .toBe("production");
});

it.each([
  ["outside GitHub Actions", { MIGRATION_TARGET: "production", DATABASE_URL: setting(productionHost) }, "Release migrations run only in the GitHub release workflow."],
  ["an unknown target", { GITHUB_ACTIONS: "true", MIGRATION_TARGET: "staging", DATABASE_URL: setting(copyHost) }, "MIGRATION_TARGET must be copy or production."],
  ["a production host in the copy job", { GITHUB_ACTIONS: "true", MIGRATION_TARGET: "copy", DATABASE_URL: setting(productionHost) }, "The database host is not a copy host. Stop."],
  ["a copy host in the production job", { GITHUB_ACTIONS: "true", MIGRATION_TARGET: "production", DATABASE_URL: setting(copyHost) }, "The database host is not a production host. Stop."],
  ["a local host", { GITHUB_ACTIONS: "true", MIGRATION_TARGET: "copy", DATABASE_URL: setting("127.0.0.1") }, "The database host is not a copy host. Stop."],
  ["a missing setting", { GITHUB_ACTIONS: "true", MIGRATION_TARGET: "copy" }, "Cannot read the database host."],
])("refuses %s", (_case, environment, message) => {
  expect(() => check(environment)).toThrow(message);
});

it("logs only known refusals and error codes, never data or connection details", () => {
  const refusal = Object.assign(new Error("Migration history does not match this version. Stop."), { code: "P0001" });
  expect(publicFailureMessage(new Error("Failed query: BEGIN; ...", { cause: refusal })))
    .toBe("Migration refused: Migration history does not match this version. Stop.");
  const noGoogleId = Object.assign(new Error(
    "An Account has no Google ID. Each Account needs exactly one sign-in method, so the owner decides by hand what happens to it. This migration deletes no Account. Stop.",
  ), { code: "P0001" });
  expect(publicFailureMessage(new Error("Failed query: BEGIN; ...", { cause: noGoogleId })))
    .toBe(`Migration refused: ${noGoogleId.message}`);
  const constraint = Object.assign(new Error('duplicate key value violates unique constraint "accounts_email_key"'), {
    code: "23505", detail: "Key (email)=(student@example.test) already exists.",
  });
  expect(publicFailureMessage(new Error("Failed query", { cause: constraint })))
    .toBe("Migration failed with database error code 23505.");
  expect(publicFailureMessage(new Error(`connect ECONNREFUSED ${setting(productionHost)}`)))
    .toBe("Migration failed. Check the connection setting and migration files.");
});

async function runScript(environment: Record<string, string>) {
  return exec(process.execPath, [
    "--import", "tsx", "--import", "./scripts/test-fixtures/stop-postgres-connection.mjs", "scripts/release-migrations.mts",
  ], { env: { NODE_ENV: "test", ...environment }, timeout: 10000 }).then(
    ({ stdout, stderr }) => ({ code: 0, output: stdout + stderr }),
    (error) => ({ code: error.code, output: error.stdout + error.stderr }),
  );
}

it("stops before connecting when the job and the host do not match", async () => {
  const result = await runScript({ GITHUB_ACTIONS: "true", MIGRATION_TARGET: "copy", DATABASE_URL: setting(productionHost) });
  expect(result).toEqual({ code: 1, output: "The database host is not a copy host. Stop.\n" });
});

it("connects only when the job and the host match", async () => {
  const result = await runScript({ GITHUB_ACTIONS: "true", MIGRATION_TARGET: "copy", DATABASE_URL: setting(copyHost) });
  expect(result).toEqual({ code: 86, output: "Test stopped at the Postgres connection boundary.\n" });
});
