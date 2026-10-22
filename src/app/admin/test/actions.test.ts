import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findAccount: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/accountRepository", () => ({ findAccountById: mocks.findAccount }));
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
      expect(mocks.findAccount).not.toHaveBeenCalled();
    },
  );
});
