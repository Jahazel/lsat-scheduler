import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import copyDatabaseHosts from "./copyDatabaseHosts.json" with { type: "json" };

const stoppedConnection = "Test stopped at the Postgres connection boundary.";
const fixture = fileURLToPath(new URL("./test-fixtures/stop-postgres-connection.mjs", import.meta.url));
const commands = [
  ["reset-dev-data", ["--yes"], "This script only runs against a local database or an approved copy-site host."],
];

function runScript(name, args, uri, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const env = { NODE_ENV: "test", ...extraEnv };
    if (uri !== undefined) env.DATABASE_URL = uri;
    execFile(process.execPath, ["--import", "tsx", "--import", fixture, fileURLToPath(new URL(`./${name}.mts`, import.meta.url)), ...args], {
      env,
      timeout: 10000,
    }, (error, stdout, stderr) => {
      if (error?.killed || error?.signal) {
        reject(new Error(`${name} did not stop before the connection timeout.`));
        return;
      }
      resolve({ code: error?.code ?? 0, output: stdout + stderr });
    });
  });
}

describe.each(commands)("%s local database protection", (name, args, targetMessage) => {
  it.each([
    ["mongodb://guard-user:guard-password@localhost:27017/db", "[unknown]"],
    ["mongodb+srv://guard-user:guard-password@localhost/db", "[unknown]"],
    ["postgres://guard-user:guard-password@ep-other.example.neon.tech/db?sslmode=require", "ep-other.example.neon.tech"],
    ["postgresql://guard-user:guard-password@ep-other.example.neon.tech/db", "ep-other.example.neon.tech"],
    ["postgresql://guard-user:guard-password@localhost:5432,ep-other.example.neon.tech:5432/db", "localhost:5432,ep-other.example.neon.tech:5432"],
    ["postgres://guard-user:guard-password@localhost/db?host=ep-other.example.neon.tech", "localhost,ep-other.example.neon.tech"],
    ["postgresql:///db?host=localhost,ep-other.example.neon.tech&password=guard-password", "localhost,ep-other.example.neon.tech"],
    ["postgresql://guard-user:guard-password@localhost/db?hostaddr=127.0.0.1,192.0.2.1", "localhost,127.0.0.1,192.0.2.1"],
    ["postgresql://guard-user:guard-password@localhost/db?host=ep-other.example.neon.tech&host=localhost", "localhost,ep-other.example.neon.tech,localhost"],
    ["postgresql://guard-user:guard-password@%65p-other.example.neon.tech/db", "ep-other.example.neon.tech"],
    ["postgresql://guard-user:guard-password@localhost/db?%68ost=ep-other.example.neon.tech", "localhost,ep-other.example.neon.tech"],
    ["postgresql://guard-user:guard-password@localhost/db?service=guard-password", "[unknown]"],
    ["postgresql://guard-user:guard-password@localhost:invalid/db", "[unknown]"],
    ["postgresql://guard-user:guard-password@localhost/db?host=guard-user%3Aguard-password%40ep-other.example.neon.tech", "[unknown]"],
    ["postgresql+srv://guard-user:guard-password@localhost/db", "[unknown]"],
    ["postgresql://guard-user:1234/guard-password@ep-other.example.neon.tech/db", "[unknown]"],
    ["postgresql://guard-user:1234?guard-password@ep-other.example.neon.tech/db", "[unknown]"],
    ["not-a-connection-string-guard-password", "[unknown]"],
    [undefined, "[unknown]"],
  ])("refuses %s before connecting", async (uri, host) => {
    const result = await runScript(name, args, uri);
    expect(result.code).toBe(1);
    expect(result.output).toContain(`Refusing database host ${host}`);
    expect(result.output).toContain(targetMessage);
    expect(result.output).not.toContain("guard-user");
    expect(result.output).not.toContain("guard-password");
    expect(result.output).not.toContain(stoppedConnection);
  });

  it.each([
    "postgres://guard-user:guard-password@localhost:5432/db",
    "postgresql://guard-user:guard-password@127.0.0.1:5432/db",
    "postgresql://guard-user:guard-password@[::1]:5432/db",
  ])("allows Postgres loopback in %s and stops at the connection boundary", async (uri) => {
    const result = await runScript(name, args, uri);
    expect(result.code).toBe(86);
    expect(result.output).toContain(stoppedConnection);
    expect(result.output).not.toContain("Refusing database host");
    expect(result.output).not.toContain("guard-password");
  });

  it.each(["postgres", "postgresql"])("ignores environment settings that try to bypass a %s refusal", async (protocol) => {
    const result = await runScript(name, args, `${protocol}://remote.example.net/db`, {
      ALLOW_REMOTE_DATABASE: "true", FORCE: "true", NODE_ENV: "development",
    });
    expect(result.code).toBe(1);
    expect(result.output).toContain("Refusing database host remote.example.net");
    expect(result.output).not.toContain(stoppedConnection);
  });

  it("refuses NODE_ENV=production before connecting", async () => {
    const result = await runScript(name, args, "postgresql://127.0.0.1:5432/db", { NODE_ENV: "production" });
    expect(result.code).toBe(1);
    expect(result.output).toContain("with NODE_ENV=production.");
    expect(result.output).not.toContain(stoppedConnection);
  });
});

it("keeps reset confirmation for a local database", async () => {
  const result = await runScript("reset-dev-data", [], "postgresql://localhost:5432/db");
  expect(result.code).toBe(1);
  expect(result.output).toContain("Re-run with --yes to confirm.");
  expect(result.output).not.toContain(stoppedConnection);
});

it.each(["postgres", "postgresql"])("reset confirmation does not bypass the %s host guard", async (protocol) => {
  const result = await runScript("reset-dev-data", ["--yes", "--force", "--allow-remote-database"], `${protocol}://remote.example.net/db`);
  expect(result.code).toBe(1);
  expect(result.output).toContain("Refusing database host remote.example.net");
  expect(result.output).not.toContain(stoppedConnection);
});

it.each(copyDatabaseHosts)("make-admin still accepts the copy host %s", async (host) => {
  const result = await runScript("make-admin", ["admin@example.test"], `postgresql://guard-user:guard-password@${host}/db`);
  expect(result.code).toBe(86);
  expect(result.output).toContain(stoppedConnection);
  expect(result.output).not.toContain("Refusing database host");
});

async function runMakeAdmin(uri) {
  return new Promise((resolve, reject) => {
    const env = { NODE_ENV: "test" };
    if (uri !== undefined) env.DATABASE_URL = uri;
    execFile(process.execPath, ["--import", "tsx", fileURLToPath(new URL("./make-admin.mts", import.meta.url)), "student@example.com"], {
      env, timeout: 10000,
    }, (error, stdout, stderr) => {
      if (error?.killed || error?.signal) {
        reject(new Error("make-admin did not stop before the connection timeout."));
        return;
      }
      resolve({ code: error?.code ?? 0, output: stdout + stderr });
    });
  });
}

describe("make-admin Postgres protection", () => {
  it.each([
    [undefined, "[unknown]"],
    ["postgres://guard-user:guard-password@ep-other.example.neon.tech/db", "ep-other.example.neon.tech"],
    ["postgresql://guard-user:guard-password@remote.example.net/db", "remote.example.net"],
    ["postgresql://guard-user:guard-password@localhost:5432,remote.example.net:5432/db", "localhost:5432,remote.example.net:5432"],
    ["postgres://guard-user:guard-password@localhost/db?host=remote.example.net", "localhost,remote.example.net"],
    ["postgresql:///db?host=localhost,remote.example.net&password=guard-password", "localhost,remote.example.net"],
    ["not-a-connection-string-guard-password", "[unknown]"],
  ])("refuses %s before connecting", async (uri, host) => {
    const result = await runMakeAdmin(uri);
    expect(result.code).toBe(1);
    expect(result.output).toContain(`Refusing database host ${host}`);
    expect(result.output).not.toContain("guard-user");
    expect(result.output).not.toContain("guard-password");
  });

  it("reports a local connection failure without driver details or credentials", async () => {
    const result = await runMakeAdmin("postgres://guard-user:guard-password@127.0.0.1:1/db");
    expect(result.code).toBe(1);
    expect(result.output).toContain("Admin promotion failed. Check the connection setting and database permissions.");
    expect(result.output).not.toContain("Refusing database host");
    expect(result.output).not.toContain("guard-user");
    expect(result.output).not.toContain("guard-password");
  });
});
