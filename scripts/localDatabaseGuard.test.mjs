import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getDatabaseHost, requireLocalDatabase } from "./localDatabaseGuard.mjs";

describe("database host reading", () => {
  it.each([
    ["postgres://user:secret@localhost:5432,127.0.0.1:5433/db", "localhost:5432,127.0.0.1:5433"],
    ["postgresql:///db?host=localhost,127.0.0.1", "localhost,127.0.0.1"],
    ["postgresql://user:p%40ssword@%6cocalhost:5432/db?host=%3A%3A1&hostaddr=127.0.0.1", "localhost:5432,::1,127.0.0.1"],
  ])("reads Postgres hosts in %s without credentials", (uri, hosts) => {
    expect(getDatabaseHost(uri)).toBe(hosts);
    expect(requireLocalDatabase(uri)).toBe(hosts);
  });

  it("shows every seed-list host without credentials", () => {
    expect(getDatabaseHost("mongodb://user:secret@h1:27017,h2:27017/db?replicaSet=rs")).toBe("h1:27017,h2:27017");
  });

  it("reads standard and SRV MongoDB hosts", () => {
    expect(getDatabaseHost("mongodb://user:secret@localhost:27017/db")).toBe("localhost:27017");
    expect(getDatabaseHost("mongodb+srv://user:secret@cluster.example.net/db")).toBe("cluster.example.net");
  });
});

describe("local database guard", () => {
  it("allows only exact committed copy-site hosts for Postgres", () => {
    // A separate checkout with a fake approved host. The real list stays empty.
    const directory = mkdtempSync(join(tmpdir(), "drillmap-guard-"));
    try {
      const guard = join(directory, "localDatabaseGuard.mjs");
      copyFileSync(new URL("./localDatabaseGuard.mjs", import.meta.url), guard);
      writeFileSync(join(directory, "copyDatabaseHosts.json"), JSON.stringify(["ep-copy.example.neon.tech"]));
      const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
        const { requireLocalDatabase } = await import(process.argv[1]);
        console.log(requireLocalDatabase("postgresql://user:secret@ep-copy.example.neon.tech/db"));
        for (const uri of [
          "postgres://user:secret@ep-other.example.neon.tech/db",
          "postgres://user:secret@ep-copy.example.neon.tech.evil.example/db",
          "postgres://user:secret@ep-copy.example.neon.tech/db?hostaddr=192.0.2.1",
          "mongodb://user:secret@ep-copy.example.neon.tech/db",
        ]) {
          try { requireLocalDatabase(uri); process.exit(2); }
          catch (error) { console.log(error.message); }
        }
      `, pathToFileURL(guard).href], { encoding: "utf8", env: {}, timeout: 2000 });
      expect(output).toContain("ep-copy.example.neon.tech\n");
      expect(output.match(/Refusing database host/g)).toHaveLength(4);
      expect(output).not.toContain("secret");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.each([
    "mongodb://localhost/db",
    "mongodb://127.0.0.1:27017/db",
    "mongodb://[::1]:27017/db",
    "mongodb://user:p%40ssword@localhost:27017,127.0.0.1:27018,[::1]:27019/db?replicaSet=local",
    "postgres://user:secret@localhost:5432/db",
    "postgresql://user:secret@[::1]:5432/db?sslmode=disable",
  ])("allows literal loopback hosts in %s", (uri) => {
    expect(requireLocalDatabase(uri)).toBe(getDatabaseHost(uri));
  });

  it.each([
    ["mongodb+srv://user:secret@cluster.example.net/db", "cluster.example.net"],
    ["mongodb+srv://user:secret@localhost/db", "localhost"],
    ["mongodb://user:secret@remote.example.net:27017/db", "remote.example.net:27017"],
    ["mongodb://user:secret@localhost:27017,remote.example.net:27017/db", "localhost:27017,remote.example.net:27017"],
    ["mongodb://user:secret@localhost.example.net/db", "localhost.example.net"],
    ["mongodb://localhost./db", "localhost."],
    ["mongodb://127.1/db", "127.1"],
    ["mongodb://2130706433/db", "2130706433"],
    ["mongodb://127.0.0.2/db", "127.0.0.2"],
    ["mongodb://[::ffff:127.0.0.1]/db", "[::ffff:127.0.0.1]"],
    ["postgresql://user:secret@remote.example.net:5432/db", "remote.example.net:5432"],
    ["mongodb://localhost/db?proxyHost=remote.example.net&proxyPassword=secret", "localhost,remote.example.net"],
    ["postgresql://localhost/db?host=remote.example.net", "localhost,remote.example.net"],
    ["postgresql://localhost/db?hostaddr=192.0.2.1", "localhost,192.0.2.1"],
  ])("refuses non-local targets in %s without credentials", (uri, hosts) => {
    expect(() => requireLocalDatabase(uri)).toThrow(`Refusing database host ${hosts}: not an allowed host.`);
    expect(() => requireLocalDatabase(uri)).not.toThrow("secret");
    expect(() => requireLocalDatabase(uri)).not.toThrow("user:");
  });

  it.each([
    undefined, "", "secret", "mongodb://user:secret@", "mongodb://user:secret@localhost:bad/db",
    "mongodb://user:secret@localhost:65536/db", "mongodb://user:secret@localhost,,127.0.0.1/db",
    "mongodb://user:secret@localhost/\n", "mongodb://user:secret@localhost\\remote.example.net/db",
    "mongodb://user:secret@localhost/db#secret", "mongodb://user:secret%zz@localhost/db",
    "mongodb://user:secret@other@localhost/db", "mongodb://user:secret@%6cocalhost/db",
    "mongodb://user:secret@[::invalid]/db",
    "mongodb://localhost/db?proxyHost=user%3Asecret%40remote.example.net",
    "https://user:secret@localhost/db",
    "postgresql+srv://user:secret@localhost/db",
    "postgresql://user:secret@localhost/db?service=secret",
    "postgresql://user:secret@localhost/db?servicefile=secret",
    "postgresql:///db",
    "postgresql://user:secret@localhost/db?host=",
    "postgresql://user:secret@localhost:65536/db",
    "postgresql://user:secret@localhost,,127.0.0.1/db",
    "postgresql://user:secret@localhost/db?host=user%3Asecret%40remote.example.net",
    "postgresql://user:secret@localhost/db?host=%00localhost",
    // An unencoded "/" or "?" in a password ends the host early, and drivers read the host there too.
    "postgresql://user:1234/secret@remote.example.net/db", "postgresql://user:1234?secret@remote.example.net/db",
    "mongodb://user:1234/secret@remote.example.net/db", "postgresql://remote.example.net:5432/secret@localhost/db",
  ])("refuses unreadable or missing input without exposing it", (uri) => {
    expect(() => requireLocalDatabase(uri)).toThrow("This script only runs against a local database or an approved copy-site host.");
    expect(() => requireLocalDatabase(uri)).not.toThrow("secret");
    expect(() => requireLocalDatabase(uri)).not.toThrow("user:");
    expect(() => getDatabaseHost(uri)).toThrow("Cannot read the database host.");
  });
});
