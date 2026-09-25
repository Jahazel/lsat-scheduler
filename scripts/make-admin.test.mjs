import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { getMongoHost, makeAdmin } from "./make-admin.mjs";

it("runs make-admin with the supplied environment", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

  expect(packageJson.scripts["make-admin"]).toBe("node scripts/make-admin.mjs");
});

it("shows every seed-list host without credentials", () => {
  expect(getMongoHost("mongodb://user:secret@h1:27017,h2:27017/db?replicaSet=rs")).toBe(
    "h1:27017,h2:27017",
  );
});

it("shows the host for standard and SRV MongoDB URIs", () => {
  expect(getMongoHost("mongodb://user:secret@localhost:27017/db")).toBe("localhost:27017");
  expect(getMongoHost("mongodb+srv://user:secret@cluster.example.net/db")).toBe(
    "cluster.example.net",
  );
});

describe("makeAdmin", () => {
  it("promotes an existing account", async () => {
    const collection = {
      findOne: vi.fn().mockResolvedValue({ _id: "user-1", email: "partner@example.com", role: "student" }),
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
    };

    const result = await makeAdmin(collection, " Partner@Example.com ");

    expect(result).toEqual({ status: "promoted", normalizedEmail: "partner@example.com" });
    expect(collection.findOne).toHaveBeenCalledWith({ email: "partner@example.com" });
    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: "user-1" },
      { $set: { role: "admin" } },
    );
  });

  it("refuses an email with no account without writing", async () => {
    const collection = {
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn(),
    };

    await expect(makeAdmin(collection, "missing@example.com", "cluster.example.net")).rejects.toThrow(
      "No account found for missing@example.com on cluster.example.net",
    );
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it("does nothing on a second run", async () => {
    const user = { _id: "user-1", role: "student" };
    const collection = {
      findOne: vi.fn().mockImplementation(async () => user),
      updateOne: vi.fn().mockImplementation(async () => {
        user.role = "admin";
      }),
    };

    expect((await makeAdmin(collection, "partner@example.com")).status).toBe("promoted");
    expect(await makeAdmin(collection, " Partner@Example.com ")).toEqual({
      status: "already-admin",
      normalizedEmail: "partner@example.com",
    });
    expect(collection.updateOne).toHaveBeenCalledTimes(1);
  });
});
