import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ find: vi.fn() }));

vi.mock("@/models/AnalyticsSnapshot", () => ({
  AnalyticsSnapshotModel: { find: mocks.find },
}));

import { listApprovedAnalyticsSnapshots } from "./analyticsSnapshotRepository";

describe("listApprovedAnalyticsSnapshots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns every approved snapshot for one student newest first", async () => {
    const lean = vi.fn().mockResolvedValue([{ id: "newest" }, { id: "older" }]);
    const sort = vi.fn().mockReturnValue({ lean });
    mocks.find.mockReturnValue({ sort });

    await expect(listApprovedAnalyticsSnapshots("student-1")).resolves.toEqual([
      { id: "newest" },
      { id: "older" },
    ]);
    expect(mocks.find).toHaveBeenCalledWith({ studentId: "student-1", status: "approved" });
    expect(sort).toHaveBeenCalledWith({ approvedAt: -1 });
  });
});
