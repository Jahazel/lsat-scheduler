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
});

const mocks = vi.hoisted(() => ({ findStudent: vi.fn(), findWeek: vi.fn() }));
vi.mock("./studentRepository", () => ({ findStudentByAccountId: mocks.findStudent }));
vi.mock("./postgres", () => ({ getPostgresDatabase: () => ({ execute: mocks.findWeek }) }));

describe("loadStudentNavState", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["LSAT Demon", "7Sage"])("reports an existing weekly schedule for %s", async (platform) => {
    mocks.findStudent.mockResolvedValue({ id: "student-1", platform, goalTestDate: "2027-01-01" });
    mocks.findWeek.mockResolvedValue({ rowCount: 1 });
    expect(await loadStudentNavState("user-1", new Date("2026-09-30T12:00:00Z"))).toMatchObject({ hasCurrentWeek: true, uploadNeeded: false });
  });
  it.each([["LSAT Demon", false], ["7Sage", true]])("only requests an upload for 7Sage when %s has no schedule", async (platform, uploadNeeded) => {
    mocks.findStudent.mockResolvedValue({ id: "student-1", platform, goalTestDate: "2027-01-01" });
    mocks.findWeek.mockResolvedValue({ rowCount: 0 });
    expect(await loadStudentNavState("user-1")).toMatchObject({ hasCurrentWeek: false, uploadNeeded });
  });
});
