import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn(),
  findStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  deleteSnapshots: vi.fn(),
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn(),
}));

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
vi.mock("@/models/User", () => ({ UserModel: { deleteOne: mocks.deleteUser } }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { deleteAccount } from "./actions";

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findStudent.mockResolvedValue({ _id: "student-1" });
    mocks.deleteSnapshots.mockResolvedValue({});
    mocks.deleteStudent.mockResolvedValue({});
    mocks.deleteUser.mockResolvedValue({});
    mocks.signOut.mockResolvedValue(undefined);
  });

  it("deletes a student's analytics snapshots before removing their account", async () => {
    const formData = new FormData();
    formData.set("confirmation", "DELETE");

    await deleteAccount(formData);

    expect(mocks.deleteSnapshots).toHaveBeenCalledWith({ studentId: "student-1" });
    expect(mocks.deleteStudent).toHaveBeenCalledWith({ _id: "student-1" });
    expect(mocks.deleteUser).toHaveBeenCalledWith({ _id: "user-1" });
    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
