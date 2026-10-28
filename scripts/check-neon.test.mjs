import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const exec = promisify(execFile);

async function run(uri) {
  try {
    const result = await exec(process.execPath, [
      "--import", "tsx", "--import", "./scripts/test-fixtures/stop-postgres-connection.mjs",
      "scripts/check-neon.mts",
    ], { env: { NODE_ENV: "test", ...(uri === undefined ? {} : { DATABASE_URL: uri }) }, timeout: 5000 });
    return { code: 0, output: result.stdout + result.stderr };
  } catch (error) {
    if (error.killed || error.signal) throw error;
    return { code: error.code, output: error.stdout + error.stderr };
  }
}

it.each([
  "postgres://private-user:private-password@remote.example.net/drillmap?sslmode=verify-full",
  "postgresql://private-user:private-password@remote.example.net/drillmap",
  "postgresql://private-user:private-password@localhost/drillmap?host=remote.example.net",
  "postgres://private-user:private-password@localhost:5432,remote.example.net:5432/drillmap",
  "postgresql://private-user:private-password@localhost/drillmap?hostaddr=192.0.2.1",
  "postgresql:///drillmap?host=remote.example.net&user=private-user&password=private-password",
  undefined,
  "private-password",
])("refuses an unsafe check target before any connection without exposing credentials", async (uri) => {
  const result = await run(uri);
  expect(result.code).toBe(1);
  expect(result.output).toContain("Refusing database host");
  expect(result.output).not.toContain("private-user");
  expect(result.output).not.toContain("private-password");
  expect(result.output).not.toContain("Test stopped at the Postgres connection boundary.");
});

const copyHost = "ep-restless-tooth-b42czg5d-pooler.c-6.us-east-2.aws.neon.tech";

it("names the sslmode reason for a copy host without exposing credentials", async () => {
  const result = await run(`postgresql://private-user:private-password@${copyHost}/neondb?sslmode=require&channel_binding=require`);
  expect(result.code).toBe(1);
  expect(result.output.trim()).toBe("Remote Postgres requires sslmode=verify-full.");
});

it("prints only the generic message for another copy host failure", async () => {
  const result = await run(`postgresql://private-user:private-password@${copyHost}/neondb?sslmode=verify-full&options=private-password`);
  expect(result.code).toBe(1);
  expect(result.output.trim()).toBe("Database foundation check failed.");
});

it("allows loopback through the check guard", async () => {
  const result = await run("postgresql://postgres:local-only@127.0.0.1:5432/drillmap");
  expect(result.code).toBe(86);
  expect(result.output).toContain("Test stopped at the Postgres connection boundary.");
});
