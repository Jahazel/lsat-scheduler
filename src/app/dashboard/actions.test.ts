import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn(),
  findStudent: vi.fn(),
  findSchedule: vi.fn(),
  saveCheckIn: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent } }));
vi.mock("@/models/WeeklySchedule", () => ({ WeeklyScheduleModel: { findOne: mocks.findSchedule } }));
vi.mock("@/lib/activityCheckInRepository", () => ({ mongooseActivityCheckIns: { save: mocks.saveCheckIn } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { saveActivityCheckIn } from "./actions";

const input = { scheduleId: "schedule-1", activityId: "MONDAY:0", status: "completed" as const, actualMinutes: 45 };

describe("saveActivityCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "student" } });
  });

  it("saves an activity check-in on the admin's own student side", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.findStudent.mockImplementation(({ userId }) => ({
      lean: async () => userId === "admin-1" ? { _id: "admin-student" } : null,
    }));
    mocks.findSchedule.mockImplementation(({ _id, studentId }) => ({
      lean: async () => _id === "schedule-1" && studentId === "admin-student"
        ? { schedule: { days: { MONDAY: { day: "MONDAY", activities: [{}] } } } }
        : null,
    }));
    mocks.saveCheckIn.mockImplementation(async (checkIn) => checkIn);

    await expect(saveActivityCheckIn(input)).resolves.toEqual(input);
  });

  it.each(["student", "admin"])("does not let a %s update another student's schedule", async (role) => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role } });
    mocks.findStudent.mockReturnValue({ lean: () => Promise.resolve({ _id: "student-1" }) });
    mocks.findSchedule.mockReturnValue({ lean: () => Promise.resolve(null) });

    await expect(saveActivityCheckIn(input)).rejects.toThrow("Weekly schedule not found");

    expect(mocks.findSchedule).toHaveBeenCalledWith({ _id: "schedule-1", studentId: "student-1" });
    expect(mocks.saveCheckIn).not.toHaveBeenCalled();
  });
});
