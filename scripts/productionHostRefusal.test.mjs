import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const exec = promisify(execFile);
const commands = [
  ["migrate-postgres", []],
  ["make-admin", ["admin@example.test"]],
  ["reset-dev-data", ["--yes"]],
  ["create-test-user", []],
  ["check-neon", []],
];

it.each(commands)("%s refuses an unapproved production-shaped host before connecting", async (name, args) => {
  for (const host of ["ep-production-guard.us-east-2.aws.neon.tech", "ep-production-guard-pooler.us-east-2.aws.neon.tech"]) {
    const result = await exec(process.execPath, [
      "--import", "tsx", "--import", "./scripts/test-fixtures/stop-postgres-connection.mjs",
      `scripts/${name}.mts`, ...args,
    ], {
      env: { NODE_ENV: "test", DATABASE_URL: `postgresql://guard-user:guard-password@${host}/drillmap` },
      timeout: 10000,
    }).then(
      ({ stdout, stderr }) => ({ code: 0, output: stdout + stderr }),
      (error) => {
        if (error.killed || error.signal) throw error;
        return { code: error.code, output: error.stdout + error.stderr };
      },
    );
    expect(result.code).toBe(1);
    expect(result.output).toContain(`Refusing database host ${host}`);
    expect(result.output).not.toContain("Test stopped at the Postgres connection boundary.");
    expect(result.output).not.toContain("guard-password");
    expect(result.output).not.toContain("guard-user");
  }
});
