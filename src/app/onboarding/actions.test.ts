import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockStudent } from "@/lib/mockData";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn(),
  findStudent: vi.fn(),
  createStudent: vi.fn(),
  createSnapshot: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent, create: mocks.createStudent } }));
vi.mock("@/models/AnalyticsSnapshot", () => ({ AnalyticsSnapshotModel: { create: mocks.createSnapshot } }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { createStudentProfile } from "./actions";

describe("createStudentProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
  });

  it("rejects an admin's direct attempt to create student records or analytics", async () => {
    await expect(createStudentProfile({ ...mockStudent, analyticsRows: [], analyticsApproval: null })).rejects.toThrow(
      "Admins have read-only access"
    );

    expect(mocks.connectDB).not.toHaveBeenCalled();
    expect(mocks.createStudent).not.toHaveBeenCalled();
    expect(mocks.createSnapshot).not.toHaveBeenCalled();
  });
});
