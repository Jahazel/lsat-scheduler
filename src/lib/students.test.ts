import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockStudent } from "@/lib/mockData";

const mocks = vi.hoisted(() => ({ find: vi.fn(), findById: vi.fn() }));
vi.mock("@/models/Student", () => ({ StudentModel: mocks }));
vi.mock("@/models/User", () => ({}));

import { getStudentWithOwner, listStudentsWithOwners } from "./students";

const rows = [
  { ...mockStudent, _id: "admin-student", userId: { _id: "admin", name: "Admin", email: "admin@example.test", role: "admin" } },
  { ...mockStudent, _id: "student-z", userId: { _id: "user-z", name: "Zoe", email: "zoe@example.test", role: "student" } },
  { ...mockStudent, _id: "orphan", userId: null },
  { ...mockStudent, _id: "student-a", userId: { _id: "user-a", name: "Ada", email: "ada@example.test", role: "student" } },
];

// Project only selected owner fields, as populate does against the database.
function query(result: typeof rows | typeof rows[number] | null) {
  return { populate: (_path: string, fields: string) => ({ lean: async () => {
    const project = (row: typeof rows[number]) => ({ ...row, userId: row.userId
      ? Object.fromEntries(Object.entries(row.userId).filter(([key]) => key === "_id" || fields.split(" ").includes(key)))
      : null });
    return Array.isArray(result) ? result.map(project) : result && project(result);
  } }) };
}

describe("All students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.find.mockImplementation(() => query(rows));
    mocks.findById.mockImplementation((id) => query(rows.find((row) => row._id === id) ?? null));
  });

  it("lists real students by name, leaving out admin-owned Students and orphaned records", async () => {
    const students = await listStudentsWithOwners();
    expect(students.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "student-a", name: "Ada" },
      { id: "student-z", name: "Zoe" },
    ]);
  });

  it.each(["admin-student", "orphan", "missing"])("returns not found for %s", async (id) => {
    await expect(getStudentWithOwner(id)).resolves.toBeNull();
  });

  it("opens a real student's record", async () => {
    await expect(getStudentWithOwner("student-a")).resolves.toMatchObject({
      id: "student-a", userId: "user-a", name: "Ada", email: "ada@example.test",
    });
  });
});
