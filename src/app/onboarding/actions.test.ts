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

  it("creates the admin's own student side", async () => {
    mocks.findStudent.mockResolvedValue(null);
    mocks.createStudent.mockResolvedValue({ _id: "admin-student" });
    await createStudentProfile({ ...mockStudent, analyticsRows: [], analyticsApproval: null });
    expect(mocks.createStudent).toHaveBeenCalledWith({ userId: "admin-1", ...mockStudent });
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    expect(mocks.createSnapshot).not.toHaveBeenCalled();
  });

  it("rejects a daily capacity outside 30 minutes to 8 hours without saving the student", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findStudent.mockResolvedValue(null);

    await expect(
      createStudentProfile({
        ...mockStudent,
        dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, TUESDAY: 0 },
        analyticsRows: [],
        analyticsApproval: null,
      })
    ).rejects.toThrow();

    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it("rejects a new student without a preferred practice-test day", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findStudent.mockResolvedValue(null);

    await expect(
      createStudentProfile({
        ...mockStudent,
        preferredPracticeTestDay: "" as never,
        analyticsRows: [],
        analyticsApproval: null,
      })
    ).rejects.toThrow();

    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it("saves each day's capacity and the preferred practice-test day", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findStudent.mockResolvedValue(null);
    mocks.createStudent.mockResolvedValue({ _id: "student-1" });
    const dailyCapacityMinutes = { ...mockStudent.dailyCapacityMinutes, MONDAY: 30, SATURDAY: 225 };

    await createStudentProfile({
      ...mockStudent,
      dailyCapacityMinutes,
      preferredPracticeTestDay: "SUNDAY",
      analyticsRows: [],
      analyticsApproval: null,
    });

    expect(mocks.createStudent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", dailyCapacityMinutes, preferredPracticeTestDay: "SUNDAY" })
    );
  });
});
