import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import productionDatabaseHosts from "./productionDatabaseHosts.json" with { type: "json" };

const exec = promisify(execFile);
// The production Neon hosts recorded in #143, plus invented production-shaped hosts.
const hosts = [
  ...productionDatabaseHosts,
  "ep-production-guard.us-east-2.aws.neon.tech",
  "ep-production-guard-pooler.us-east-2.aws.neon.tech",
];
const commands = [
  ["migrate-postgres", []],
  ["make-admin", ["admin@example.test"]],
  ["reset-dev-data", ["--yes"]],
  ["check-neon", []],
  ["replay-deletions", []],
];
const commandTimeout = 10000;

function runGuarded(name, args, env) {
  return exec(process.execPath, [
    "--import", "tsx", "--import", "./scripts/test-fixtures/stop-postgres-connection.mjs",
    `scripts/${name}.mts`, ...args,
  ], { env: { NODE_ENV: "test", ...env }, timeout: commandTimeout }).then(
    ({ stdout, stderr }) => ({ code: 0, output: stdout + stderr }),
    (error) => {
      if (error.killed || error.signal) throw error;
      return { code: error.code, output: error.stdout + error.stderr };
    },
  );
}

it.each(commands)("%s refuses the production hosts before connecting", async (name, args) => {
  for (const host of hosts) {
    const result = await runGuarded(name, args, { DATABASE_URL: `postgresql://guard-user:guard-password@${host}/drillmap` });
    expect(result.code).toBe(1);
    expect(result.output).toContain(`Refusing database host ${host}`);
    expect(result.output).not.toContain("Test stopped at the Postgres connection boundary.");
    expect(result.output).not.toContain("guard-password");
    expect(result.output).not.toContain("guard-user");
  }
}, hosts.length * commandTimeout);

it("replay-deletions refuses a production host for the deletion list before connecting", async () => {
  for (const host of hosts) {
    const result = await runGuarded("replay-deletions", [], {
      DATABASE_URL: "postgresql://guard-user:guard-password@localhost/drillmap",
      DELETION_LIST_URL: `postgresql://guard-user:guard-password@${host}/drillmap`,
      AUTH_SECRET: "guard-secret",
    });
    expect(result.code).toBe(1);
    expect(result.output).toContain(`Refusing database host ${host}`);
    expect(result.output).not.toContain("Test stopped at the Postgres connection boundary.");
    expect(result.output).not.toContain("guard-password");
  }
}, hosts.length * commandTimeout);
