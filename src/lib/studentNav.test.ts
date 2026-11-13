import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialsFor, loadStudentNavState } from "./studentNav";

describe("initialsFor", () => {
  it("uses first and last name initials", () => {
    expect(initialsFor("Sam Rivera", "sam@example.com")).toBe("SR");
    expect(initialsFor("Sam Q. Rivera", null)).toBe("SR");
  });

  it("falls back to a single name, then the email", () => {
    expect(initialsFor("Sam", null)).toBe("SA");
    expect(initialsFor(null, "jo@example.com")).toBe("J");
    expect(initialsFor("  ", undefined)).toBe("?");
  });

  it("keeps today's results for Latin, accented, and non-Latin names", () => {
    expect(initialsFor("Ana López", null)).toBe("AL");
    expect(initialsFor("Q", null)).toBe("Q");
    expect(initialsFor("佐藤 美咲", null)).toBe("佐美");
    expect(initialsFor(undefined, undefined)).toBe("?");
  });

  it("keeps an emoji whole when it starts a name part", () => {
    expect(initialsFor("🌟Ana López", null)).toBe("🌟L");
    expect(initialsFor("🇯🇵 Kenji", null)).toBe("🇯🇵K");
    expect(initialsFor("👨‍👩‍👧 Family", null)).toBe("👨‍👩‍👧F");
    expect(initialsFor("👩🏽‍💻", null)).toBe("👩🏽‍💻");
    expect(initialsFor(null, "🌟@example.com")).toBe("🌟");
  });
});

const mocks = vi.hoisted(() => ({ findStudent: vi.fn(), execute: vi.fn(), snapshots: vi.fn() }));
vi.mock("./studentRepository", () => ({ findStudentByAccountId: mocks.findStudent }));
vi.mock("./postgres", () => ({
  getPostgresDatabase: () => ({ execute: mocks.execute, select: () => ({ from: () => ({ where: mocks.snapshots }) }) }),
}));

describe("loadStudentNavState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.snapshots.mockResolvedValue([]);
  });
  it("reports an existing weekly schedule", async () => {
    mocks.findStudent.mockResolvedValue({ id: "student-1", goalTestDate: "2027-01-01" });
    mocks.execute.mockResolvedValue({ rows: [{ week: "2026-09-28" }] });
    expect(await loadStudentNavState("user-1", new Date("2026-09-30T12:00:00Z"))).toMatchObject({ hasCurrentWeek: true, hasUploadWeek: true, uploadNeeded: false });
  });
  it("reports next week's saved preview on a weekend", async () => {
    mocks.findStudent.mockResolvedValue({ id: "student-1", goalTestDate: "2027-01-01" });
    mocks.execute.mockResolvedValue({ rows: [{ week: "2026-11-02" }] });
    expect(await loadStudentNavState("user-1", new Date("2026-11-01T16:00:00Z"))).toMatchObject({ hasCurrentWeek: false, hasUploadWeek: true });
  });
  it("requests an upload when there is no schedule", async () => {
    mocks.findStudent.mockResolvedValue({ id: "student-1", goalTestDate: "2027-01-01" });
    mocks.execute.mockResolvedValue({ rows: [] });
    expect(await loadStudentNavState("user-1")).toMatchObject({ hasCurrentWeek: false, uploadNeeded: true });
  });
  it("needs no upload on a weekend once next week's upload is confirmed", async () => {
    mocks.findStudent.mockResolvedValue({ id: "student-1", goalTestDate: "2027-01-01" });
    mocks.execute.mockResolvedValue({ rows: [] });
    mocks.snapshots.mockResolvedValue([{ approvedAt: new Date("2026-10-31T16:00:00Z") }]);
    expect(await loadStudentNavState("user-1", new Date("2026-11-01T16:00:00Z"))).toMatchObject({ hasCurrentWeek: false, uploadNeeded: false });
  });
  it("still needs an upload on a weekend when only last weekend's upload is confirmed", async () => {
    mocks.findStudent.mockResolvedValue({ id: "student-1", goalTestDate: "2027-01-01" });
    mocks.execute.mockResolvedValue({ rows: [] });
    mocks.snapshots.mockResolvedValue([{ approvedAt: new Date("2026-10-18T16:00:00Z") }]);
    expect(await loadStudentNavState("user-1", new Date("2026-11-01T16:00:00Z"))).toMatchObject({ uploadNeeded: true });
  });
});
