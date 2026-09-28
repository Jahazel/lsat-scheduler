import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockStudent } from "@/lib/mockData";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn(),
  findStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  deleteSnapshots: vi.fn(),
  findSchedules: vi.fn(),
  deleteSchedules: vi.fn(),
  deleteCheckIns: vi.fn(),
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth, signOut: mocks.signOut }));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/Student", () => ({
  StudentModel: {
    findOne: mocks.findStudent,
    findOneAndUpdate: mocks.updateStudent,
    deleteOne: mocks.deleteStudent,
  },
}));
vi.mock("@/models/AnalyticsSnapshot", () => ({
  AnalyticsSnapshotModel: { deleteMany: mocks.deleteSnapshots },
}));
vi.mock("@/models/WeeklySchedule", () => ({
  WeeklyScheduleModel: { find: mocks.findSchedules, deleteMany: mocks.deleteSchedules },
}));
vi.mock("@/models/ActivityCheckIn", () => ({
  ActivityCheckInModel: { deleteMany: mocks.deleteCheckIns },
}));
vi.mock("@/models/User", () => ({ UserModel: { deleteOne: mocks.deleteUser } }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { deleteAccount, updateStudentProfile } from "./actions";

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findStudent.mockResolvedValue({ _id: "student-1" });
    mocks.deleteSnapshots.mockResolvedValue({});
    mocks.findSchedules.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([{ _id: "schedule-1" }]) }) });
    mocks.deleteSchedules.mockResolvedValue({});
    mocks.deleteCheckIns.mockResolvedValue({});
    mocks.deleteStudent.mockResolvedValue({});
    mocks.deleteUser.mockResolvedValue({});
    mocks.signOut.mockResolvedValue(undefined);
  });

  it("deletes a student's schedules and check-ins with their analytics snapshots before removing their account", async () => {
    const formData = new FormData();
    formData.set("confirmation", "DELETE");

    await deleteAccount(formData);

    expect(mocks.deleteSnapshots).toHaveBeenCalledWith({ studentId: "student-1" });
    expect(mocks.deleteCheckIns).toHaveBeenCalledWith({ scheduleId: { $in: ["schedule-1"] } });
    expect(mocks.deleteSchedules).toHaveBeenCalledWith({ studentId: "student-1" });
    expect(mocks.deleteStudent).toHaveBeenCalledWith({ _id: "student-1" });
    expect(mocks.deleteUser).toHaveBeenCalledWith({ _id: "user-1" });
    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });

  it("rejects an admin's direct attempt to delete student schedules, analytics, or check-ins", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    const formData = new FormData();
    formData.set("confirmation", "DELETE");

    await expect(deleteAccount(formData)).rejects.toThrow("This action is not available for admin accounts.");

    expect(mocks.connectDB).not.toHaveBeenCalled();
    expect(mocks.deleteSnapshots).not.toHaveBeenCalled();
    expect(mocks.deleteCheckIns).not.toHaveBeenCalled();
    expect(mocks.deleteSchedules).not.toHaveBeenCalled();
    expect(mocks.deleteStudent).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});

describe("updateStudentProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.updateStudent.mockResolvedValue({ _id: "student-1" });
  });

  it("rejects a daily capacity off the 15-minute step without changing the student", async () => {
    await expect(
      updateStudentProfile({
        ...mockStudent,
        dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, FRIDAY: 100 },
        analyticsRows: [],
        analyticsApproval: null,
      })
    ).rejects.toThrow();

    expect(mocks.updateStudent).not.toHaveBeenCalled();
  });

  it("rejects a daily capacity over 8 hours without changing the student", async () => {
    await expect(
      updateStudentProfile({
        ...mockStudent,
        dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, SUNDAY: 495 },
        analyticsRows: [],
        analyticsApproval: null,
      })
    ).rejects.toThrow();

    expect(mocks.updateStudent).not.toHaveBeenCalled();
  });

  it.each(["student", "admin"])("saves study settings on the signed-in %s's own Student", async (role) => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role } });
    const dailyCapacityMinutes = { ...mockStudent.dailyCapacityMinutes, WEDNESDAY: 480 };

    await updateStudentProfile({
      ...mockStudent,
      dailyCapacityMinutes,
      preferredPracticeTestDay: "WEDNESDAY",
      analyticsRows: [],
      analyticsApproval: null,
    });

    expect(mocks.updateStudent).toHaveBeenCalledWith(
      { userId: "user-1" },
      expect.objectContaining({ dailyCapacityMinutes, preferredPracticeTestDay: "WEDNESDAY" })
    );
  });
});
