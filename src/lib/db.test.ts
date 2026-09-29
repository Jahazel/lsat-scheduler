import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock("mongoose", () => ({
  default: { connect: mocks.connect },
}));

describe("connectDB", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.connect.mockReset();
    delete globalThis.mongooseCache;
    vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017/test");
  });

  it("retries after a connection attempt fails", async () => {
    const connection = { connected: true };
    mocks.connect
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(connection);

    const { connectDB } = await import("./db");

    await expect(connectDB()).rejects.toThrow("temporary network failure");
    await expect(connectDB()).resolves.toBe(connection);
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });
});
