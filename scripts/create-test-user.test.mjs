import bcrypt from "bcryptjs";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createTestUser, parseTestUserArgs } from "./create-test-user.mjs";

const fixture = fileURLToPath(new URL("./test-fixtures/stop-database-connection.mjs", import.meta.url));
const script = fileURLToPath(new URL("./create-test-user.mjs", import.meta.url));
const stoppedConnection = "Test stopped before database connection.";

function runScript(uri, nodeEnv = "test", args = []) {
  return new Promise((resolve, reject) => {
    const env = { NODE_ENV: nodeEnv };
    if (uri !== undefined) env.MONGODB_URI = uri;
    execFile(process.execPath, ["--import", fixture, script, ...args], { env, timeout: 2000 }, (error, stdout, stderr) => {
      if (error?.killed || error?.signal) return reject(new Error("Command did not stop before the connection timeout."));
      resolve({ code: error?.code ?? 0, output: stdout + stderr });
    });
  });
}

describe("create-test-user command protection", () => {
  it.each([
    undefined,
    "mongodb://guard-user:guard-password@remote.example.net/db",
    "mongodb+srv://guard-user:guard-password@localhost/db",
    "mongodb://localhost:27017,remote.example.net:27017/db",
    "mongodb://localhost/db?proxyHost=remote.example.net",
  ])("refuses %s before connecting or writing", async (uri) => {
    const result = await runScript(uri);
    expect(result.code).toBe(1);
    expect(result.output).toContain("Refusing database host");
    expect(result.output).not.toContain(stoppedConnection);
    expect(result.output).not.toContain("guard-password");
    expect(result.output).not.toContain("Password:");
  });

  it("refuses production before connecting or writing", async () => {
    const result = await runScript("mongodb://127.0.0.1:27017/db", "production");
    expect(result.code).toBe(1);
    expect(result.output).toContain("NODE_ENV=production");
    expect(result.output).not.toContain(stoppedConnection);
  });

  it.each(["postgres://localhost/db", "postgresql://127.0.0.1/db"])("refuses non-MongoDB target %s", async (uri) => {
    const result = await runScript(uri);
    expect(result.code).toBe(1);
    expect(result.output).toContain("only supports MongoDB");
    expect(result.output).not.toContain(stoppedConnection);
  });

  it.each(["localhost:27017", "127.0.0.1:27017", "[::1]:27017"])("allows local MongoDB at %s", async (host) => {
    const result = await runScript(`mongodb://${host}/db`);
    expect(result.code).toBe(1);
    expect(result.output).toContain(stoppedConnection);
  });

  it("refuses invalid arguments before connecting", async () => {
    const result = await runScript("mongodb://127.0.0.1:27017/db", "test", ["--email"]);
    expect(result.code).toBe(1);
    expect(result.output).not.toContain(stoppedConnection);
    expect(result.output).toContain("Usage: npm run create-test-user");
  });
});

describe("parseTestUserArgs", () => {
  it.each([
    [["--email", " Parallel@Test.Local "], "student"],
    [["--admin", "--email", " Parallel@Test.Local "], "admin"],
    [["--email", " Parallel@Test.Local ", "--admin"], "admin"],
  ])("normalizes a custom Account email with %j", (args, role) => {
    expect(parseTestUserArgs(args)).toEqual({ email: "parallel@test.local", role });
  });

  it.each([
    ["--email"], ["--email", ""], ["--email", "   "], ["--email", "invalid"],
    ["--unknown"], ["student@test.local"],
  ].map((args) => [args]))("refuses invalid arguments %j", (args) => {
    expect(() => parseTestUserArgs(args)).toThrow();
  });
});

describe("createTestUser", () => {
  it("makes the default student Account with a sign-in password", async () => {
    const collection = { updateOne: vi.fn().mockResolvedValue({ acknowledged: true, upsertedCount: 1 }) };

    const result = await createTestUser(collection, parseTestUserArgs([]));

    expect(result).toEqual({ email: "student@test.local", password: "DrillMapTest123", role: "student" });
    const [filter, update, options] = collection.updateOne.mock.calls[0];
    expect(filter).toEqual({ email: "student@test.local" });
    expect(options).toEqual({ upsert: true });
    expect(update.$set.role).toBe("student");
    expect(update.$setOnInsert).toEqual({ name: "Test Student" });
    expect(update.$set.passwordHash).not.toBe(result.password);
    expect(await bcrypt.compare(result.password, update.$set.passwordHash)).toBe(true);
    expect(bcrypt.getRounds(update.$set.passwordHash)).toBe(10);
  });

  it("makes an Admin Account with --admin", async () => {
    const collection = { updateOne: vi.fn().mockResolvedValue({ acknowledged: true, upsertedCount: 1 }) };

    const result = await createTestUser(collection, parseTestUserArgs(["--admin"]));

    expect(result).toEqual({ email: "admin@test.local", password: "DrillMapTest123", role: "admin" });
    expect(collection.updateOne.mock.calls[0][1].$setOnInsert).toEqual({ name: "Test Admin" });
    expect(collection.updateOne.mock.calls[0][1].$set.role).toBe("admin");
  });

  it("resets an existing Account without changing its identity or study records", async () => {
    const account = {
      _id: "account-1", email: "parallel@test.local", name: "Existing Student",
      role: "admin", passwordHash: await bcrypt.hash("DifferentPassword123", 10),
      simulatedDate: "2026-10-15",
    };
    const collection = {
      updateOne: vi.fn().mockImplementation(async (filter, update, options) => {
        expect(filter).toEqual({ email: account.email });
        expect(options).toEqual({ upsert: true });
        expect(Object.keys(update)).toEqual(["$set", "$setOnInsert"]);
        expect(Object.keys(update.$set).sort()).toEqual(["passwordHash", "role"]);
        Object.assign(account, update.$set);
        return { acknowledged: true, matchedCount: 1 };
      }),
    };

    await createTestUser(collection, parseTestUserArgs(["--email", "parallel@test.local"]));
    const result = await createTestUser(collection, parseTestUserArgs(["--email", "parallel@test.local"]));

    expect(account).toMatchObject({
      _id: "account-1", email: "parallel@test.local", name: "Existing Student",
      role: "student", simulatedDate: "2026-10-15",
    });
    expect(await bcrypt.compare(result.password, account.passwordHash)).toBe(true);
    expect(await bcrypt.compare("DifferentPassword123", account.passwordHash)).toBe(false);
  });

  it.each([{ acknowledged: false }, { acknowledged: true, matchedCount: 0, upsertedCount: 0 }])(
    "refuses to report credentials when no Account was saved: %j", async (writeResult) => {
      const collection = { updateOne: vi.fn().mockResolvedValue(writeResult) };
      await expect(createTestUser(collection, parseTestUserArgs([]))).rejects.toThrow("No Account saved");
    },
  );
});
