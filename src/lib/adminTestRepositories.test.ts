import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const session = { id: "transaction-session" };
  return {
    session,
    transaction: vi.fn(async (work: (session: { id: string }) => Promise<void>) => work(session)),
    findSchedules: vi.fn(() => ({
      select: () => ({ session: () => ({ lean: async () => [{ _id: "schedule-1" }] }) }),
    })),
    deleteCheckIns: vi.fn(),
    deleteSchedules: vi.fn(async () => ({ deletedCount: 1 })),
    deleteSnapshots: vi.fn(),
    deleteStudent: vi.fn(),
    updateUser: vi.fn(),
  };
});

vi.mock("mongoose", () => ({ default: { connection: { transaction: mocks.transaction } } }));
vi.mock("@/models/WeeklySchedule", () => ({ WeeklyScheduleModel: { find: mocks.findSchedules, deleteMany: mocks.deleteSchedules } }));
vi.mock("@/models/ActivityCheckIn", () => ({ ActivityCheckInModel: { deleteMany: mocks.deleteCheckIns } }));
vi.mock("@/models/AnalyticsSnapshot", () => ({ AnalyticsSnapshotModel: { deleteMany: mocks.deleteSnapshots } }));
vi.mock("@/models/Student", () => ({ StudentModel: { deleteOne: mocks.deleteStudent } }));
vi.mock("@/models/User", () => ({ UserModel: { updateOne: mocks.updateUser } }));
vi.mock("./analyticsSnapshotRepository", () => ({ listApprovedAnalyticsSnapshots: vi.fn() }));
vi.mock("./studentClock", () => ({ mongooseAdminClock: {} }));

import { mongooseAdminTestRepositories } from "./adminTestRepositories";

it("scopes every transaction write to the admin's student side", async () => {
  await mongooseAdminTestRepositories.inTransaction(async (writes) => {
    expect(await writes.deleteSchedules("admin-student", "2026-10-05")).toBe(1);
    await writes.deleteSchedules("admin-student");
    await writes.deleteSnapshots("admin-student");
    await writes.deleteStudent("admin-student", "admin-user");
    await writes.clearSimulatedDate("admin-user");
  });

  expect(mocks.transaction).toHaveBeenCalledOnce();
  expect(mocks.findSchedules).toHaveBeenCalledWith({ studentId: "admin-student", weekStartDate: "2026-10-05" });
  expect(mocks.findSchedules).toHaveBeenCalledWith({ studentId: "admin-student" });
  expect(mocks.deleteCheckIns).toHaveBeenCalledWith(
    { scheduleId: { $in: ["schedule-1"] } }, { session: mocks.session },
  );
  expect(mocks.deleteSchedules).toHaveBeenCalledWith(
    { studentId: "admin-student", weekStartDate: "2026-10-05" }, { session: mocks.session },
  );
  expect(mocks.deleteSchedules).toHaveBeenCalledWith(
    { studentId: "admin-student" }, { session: mocks.session },
  );
  expect(mocks.deleteSnapshots).toHaveBeenCalledWith(
    { studentId: "admin-student" }, { session: mocks.session },
  );
  expect(mocks.deleteStudent).toHaveBeenCalledWith(
    { _id: "admin-student", userId: "admin-user" }, { session: mocks.session },
  );
  expect(mocks.updateUser).toHaveBeenCalledWith(
    { _id: "admin-user", role: "admin" },
    { $unset: { simulatedDate: 1 } },
    { session: mocks.session },
  );
});
