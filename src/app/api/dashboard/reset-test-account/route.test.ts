import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn(),
  findStudent: vi.fn(),
  findSchedules: vi.fn(),
  deleteCheckIns: vi.fn(),
  deleteSchedules: vi.fn(),
  deleteSnapshots: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent } }));
vi.mock("@/models/WeeklySchedule", () => ({ WeeklyScheduleModel: { find: mocks.findSchedules, deleteMany: mocks.deleteSchedules } }));
vi.mock("@/models/ActivityCheckIn", () => ({ ActivityCheckInModel: { deleteMany: mocks.deleteCheckIns } }));
vi.mock("@/models/AnalyticsSnapshot", () => ({ AnalyticsSnapshotModel: { deleteMany: mocks.deleteSnapshots } }));

import { POST } from "./route";

describe("POST /api/dashboard/reset-test-account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "student" } });
    mocks.findStudent.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "student-1" }) });
    mocks.findSchedules.mockReturnValue({ lean: vi.fn().mockResolvedValue([{ _id: "schedule-1" }]) });
    mocks.deleteCheckIns.mockResolvedValue({});
    mocks.deleteSchedules.mockResolvedValue({});
    mocks.deleteSnapshots.mockResolvedValue({});
  });

  afterEach(() => vi.unstubAllEnvs());

  it("deletes only the signed-in student's schedules, check-ins, and analytics snapshots", async () => {
    await expect(POST()).resolves.toMatchObject({ status: 200 });

    expect(mocks.deleteCheckIns).toHaveBeenCalledWith({ scheduleId: { $in: ["schedule-1"] } });
    expect(mocks.deleteSchedules).toHaveBeenCalledWith({ studentId: "student-1" });
    expect(mocks.deleteSnapshots).toHaveBeenCalledWith({ studentId: "student-1" });
  });

  it("does not expose the reset endpoint outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(POST()).resolves.toMatchObject({ status: 404 });
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("keeps the reset endpoint blocked for admins", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });

    const response = await POST();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "This action is not available for admin accounts.",
    });
    expect(mocks.findStudent).not.toHaveBeenCalled();
  });
});
