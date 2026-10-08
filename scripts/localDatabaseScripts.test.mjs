import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stoppedConnection = "Test stopped before database connection.";
const fixture = fileURLToPath(new URL("./test-fixtures/stop-database-connection.mjs", import.meta.url));
const commands = [
  ["reset-dev-data", ["--yes"]],
  ["make-admin", ["student@example.com"]],
  ["migrate-analytics-snapshots", []],
  ["migrate-weekly-schedules", []],
  ["migrate-activity-check-ins", []],
];

function runScript(name, args, uri, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const env = { NODE_ENV: "test", ...extraEnv };
    // No inherited secrets, env files, NODE_OPTIONS, or database settings.
    if (uri !== undefined) env.MONGODB_URI = uri;
    execFile(process.execPath, ["--import", fixture, fileURLToPath(new URL(`./${name}.mjs`, import.meta.url)), ...args], {
      env,
      timeout: 2000,
    }, (error, stdout, stderr) => {
      if (error?.killed || error?.signal) {
        reject(new Error(`${name} did not stop before the connection timeout.`));
        return;
      }
      resolve({ code: error?.code ?? 0, output: stdout + stderr });
    });
  });
}

describe.each(commands)("%s local database protection", (name, args) => {
  it.each([
    ["mongodb+srv://guard-user:guard-password@cluster.example.net/db", "cluster.example.net"],
    ["mongodb://guard-user:guard-password@remote.example.net:27017/db", "remote.example.net:27017"],
    ["mongodb://guard-user:guard-password@localhost:27017,remote.example.net:27017/db", "localhost:27017,remote.example.net:27017"],
    ["mongodb://guard-user:guard-password@localhost/db?proxyHost=remote.example.net", "localhost,remote.example.net"],
    ["mongodb+srv://guard-user:guard-password@localhost/db", "localhost"],
    [undefined, "[unknown]"],
    ["mongodb://guard-user:guard-password@localhost:invalid/db", "[unknown]"],
  ])("refuses %s before connecting", async (uri, host) => {
    const result = await runScript(name, args, uri);
    expect(result.code).toBe(1);
    expect(result.output).toContain(`Refusing database host ${host}`);
    expect(result.output).toContain("This script only runs against a local database.");
    expect(result.output).not.toContain("guard-user");
    expect(result.output).not.toContain("guard-password");
    expect(result.output).not.toContain(stoppedConnection);
  });

  it.each(["localhost:27017", "127.0.0.1:27017", "[::1]:27017"])("allows %s and stops at the connection boundary", async (host) => {
    const result = await runScript(name, args, `mongodb://${host}/db`);
    expect(result.code).toBe(1);
    expect(result.output).toContain(stoppedConnection);
    expect(result.output).not.toContain("Refusing database host");
  });

  it("ignores environment settings that try to bypass the refusal", async () => {
    const result = await runScript(name, args, "mongodb://remote.example.net/db", {
      ALLOW_REMOTE_DATABASE: "true", FORCE: "true", NODE_ENV: "development",
    });
    expect(result.code).toBe(1);
    expect(result.output).toContain("Refusing database host remote.example.net");
    expect(result.output).not.toContain(stoppedConnection);
  });
});

it("keeps reset confirmation for a local database", async () => {
  const result = await runScript("reset-dev-data", [], "mongodb://localhost:27017/db");
  expect(result.code).toBe(1);
  expect(result.output).toContain("Re-run with --yes to confirm.");
  expect(result.output).not.toContain(stoppedConnection);
});

it("keeps reset refusal in production", async () => {
  const result = await runScript("reset-dev-data", ["--yes"], "mongodb://localhost:27017/db", { NODE_ENV: "production" });
  expect(result.code).toBe(1);
  expect(result.output).toContain("Refusing to reset data with NODE_ENV=production.");
  expect(result.output).not.toContain(stoppedConnection);
});

it("reset confirmation does not bypass the host guard", async () => {
  const result = await runScript("reset-dev-data", ["--yes", "--force", "--allow-remote-database"], "mongodb://remote.example.net/db");
  expect(result.code).toBe(1);
  expect(result.output).toContain("Refusing database host remote.example.net");
  expect(result.output).not.toContain(stoppedConnection);
});
