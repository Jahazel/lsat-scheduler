import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { makeAdmin, withHostOnRefusal } from "./make-admin.mjs";

it("runs make-admin without a preset environment file", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

  expect(packageJson.scripts["make-admin"]).toBe("node scripts/make-admin.mjs");
});

describe("makeAdmin", () => {
  it("refuses to report a promotion when the update has no matched count", async () => {
    const collection = {
      findOne: vi.fn().mockResolvedValue({ _id: "user-1", role: "student" }),
      updateOne: vi.fn().mockResolvedValue({ acknowledged: false }),
    };

    await expect(makeAdmin(collection, "partner@example.com")).rejects.toThrow(
      /^No account updated for partner@example\.com$/,
    );
  });

  it("refuses to report a promotion when the account was not updated", async () => {
    const collection = {
      findOne: vi.fn().mockResolvedValue({ _id: "user-1", role: "student" }),
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 0 }),
    };

    await expect(makeAdmin(collection, "partner@example.com")).rejects.toThrow(
      /^No account updated for partner@example\.com$/,
    );
    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: "user-1" },
      { $set: { role: "admin" } },
    );
  });

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

    await expect(makeAdmin(collection, "missing@example.com")).rejects.toThrow(
      /^No account found for missing@example\.com$/,
    );
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it("does nothing on a second run", async () => {
    const user = { _id: "user-1", role: "student" };
    const collection = {
      findOne: vi.fn().mockImplementation(async () => user),
      updateOne: vi.fn().mockImplementation(async () => {
        user.role = "admin";
        return { matchedCount: 1 };
      }),
    };

    expect((await makeAdmin(collection, "partner@example.com")).status).toBe("promoted");
    expect(await makeAdmin(collection, " Partner@Example.com ")).toEqual({
      status: "already-admin",
      normalizedEmail: "partner@example.com",
    });
    expect(collection.findOne).toHaveBeenNthCalledWith(2, { email: "partner@example.com" });
    expect(collection.updateOne).toHaveBeenCalledTimes(1);
  });
});

describe("withHostOnRefusal", () => {
  it("includes the database host in a User refusal", async () => {
    const collection = {
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn(),
    };

    const refusal = await makeAdmin(collection, "missing@example.com").catch((error) => error);

    expect(withHostOnRefusal(refusal, "cluster.example.net").message).toBe(
      "No account found for missing@example.com on cluster.example.net",
    );
  });

  it("preserves driver errors and their codes", async () => {
    const driverError = Object.assign(new Error("Write failed"), { code: 123 });
    const collection = {
      findOne: vi.fn().mockResolvedValue({ _id: "user-1", role: "student" }),
      updateOne: vi.fn().mockRejectedValue(driverError),
    };

    const error = await makeAdmin(collection, "partner@example.com").catch((caught) => caught);

    expect(withHostOnRefusal(error, "cluster.example.net")).toBe(driverError);
  });
});
