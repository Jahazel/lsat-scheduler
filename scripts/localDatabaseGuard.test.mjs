import { describe, expect, it } from "vitest";
import { getDatabaseHost, requireLocalDatabase } from "./localDatabaseGuard.mjs";

describe("database host reading", () => {
  it("shows every seed-list host without credentials", () => {
    expect(getDatabaseHost("mongodb://user:secret@h1:27017,h2:27017/db?replicaSet=rs")).toBe("h1:27017,h2:27017");
  });

  it("reads standard and SRV MongoDB hosts", () => {
    expect(getDatabaseHost("mongodb://user:secret@localhost:27017/db")).toBe("localhost:27017");
    expect(getDatabaseHost("mongodb+srv://user:secret@cluster.example.net/db")).toBe("cluster.example.net");
  });
});

describe("local database guard", () => {
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
    expect(() => requireLocalDatabase(uri)).toThrow(`Refusing database host ${hosts}: not a local host.`);
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
  ])("refuses unreadable or missing input without exposing it", (uri) => {
    expect(() => requireLocalDatabase(uri)).toThrow("This script only runs against a local database.");
    expect(() => requireLocalDatabase(uri)).not.toThrow("secret");
    expect(() => getDatabaseHost(uri)).toThrow("Cannot read the database host.");
  });
});
