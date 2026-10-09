import { afterEach, describe, expect, it, vi } from "vitest";
import { closePostgresDatabase, getPostgresDatabase, requirePostgresTestTarget } from "./postgres";

afterEach(async () => {
  await closePostgresDatabase();
  vi.unstubAllEnvs();
});

describe("Postgres connection protection", () => {
  it.each(["disable", "allow", "prefer", "require", "verify-ca", "no-verify"])(
    "refuses remote sslmode=%s before connecting without exposing credentials",
    (mode) => {
      vi.stubEnv("DATABASE_URL", `postgresql://private-user:private-password@remote.example.net/drillmap?sslmode=${mode}`);
      expect(() => getPostgresDatabase()).toThrow("Remote Postgres requires sslmode=verify-full.");
      expect(() => getPostgresDatabase()).not.toThrow("private-user");
      expect(() => getPostgresDatabase()).not.toThrow("private-password");
    },
  );

  it.each([
    "postgresql://postgres:local-only@LOCALHOST/drillmap",
    "postgresql://postgres:local-only@[::1]/drillmap",
    "postgresql:///drillmap?host=::1&user=postgres",
  ])("allows loopback spellings for test setup", (setting) => {
    vi.stubEnv("DATABASE_URL", setting);
    expect(() => requirePostgresTestTarget()).not.toThrow();
  });

  it("reuses the same database across module reloads", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:local-only@127.0.0.1/drillmap");
    const db = getPostgresDatabase();
    vi.resetModules();
    const reloaded = await import("./postgres");
    expect(reloaded.getPostgresDatabase()).toBe(db);
  });
});
