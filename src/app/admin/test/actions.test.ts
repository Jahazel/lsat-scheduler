import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUser: vi.fn(),
  connectDB: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/User", () => ({ UserModel: { findById: mocks.findUser } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  setSimulatedDate,
  generateTestSample,
  resetTestData,
  resetEverything,
  rebuildThisWeek,
} from "./actions";

const actions = [
  () => setSimulatedDate("2026-10-07"),
  () => generateTestSample("steady"),
  resetTestData,
  resetEverything,
  rebuildThisWeek,
];
describe("admin test actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(actions)(
    "rejects a non-admin before database access",
    async (action) => {
      mocks.auth.mockResolvedValue({
        user: { id: "student", role: "student" },
      });
      await expect(action()).rejects.toThrow("Admin access required");
      expect(mocks.connectDB).not.toHaveBeenCalled();
      expect(mocks.findUser).not.toHaveBeenCalled();
    },
  );
  it.each(actions)("rejects a stale admin token", async (action) => {
    mocks.auth.mockResolvedValue({
      user: { id: "former-admin", role: "admin" },
    });
    mocks.findUser.mockReturnValue({ lean: async () => ({ role: "student" }) });
    await expect(action()).rejects.toThrow("Admin access required");
  });
});
