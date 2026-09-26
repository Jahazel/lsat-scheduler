import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectDB: vi.fn(),
  findStudent: vi.fn(),
  createSnapshot: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/Student", () => ({
  StudentModel: { findOne: mocks.findStudent },
}));
vi.mock("@/models/AnalyticsSnapshot", () => ({
  AnalyticsSnapshotModel: { create: mocks.createSnapshot },
}));

import { POST } from "./route";

const confirmedUpload = {
  lrAccuracyByType: { "Main Point": 0.72 },
  lrTopPriorityLogicTypes: ["Sufficient Assumption"],
  extraction: { source: "7sage_screenshot", extractedAt: "2026-09-14T15:00:00.000Z" },
  confirmation: {
    extractedValuesMatch: true,
    isLatestAnalytics: true,
    confirmedAt: "2026-09-14T15:05:00.000Z",
  },
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T16:00:00.000Z"));
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findStudent.mockResolvedValue({ _id: "student-1" });
    mocks.createSnapshot.mockResolvedValue({});
  });

  it("appends a provenance-bearing approved snapshot for each confirmed upload", async () => {
    await expect(POST(request(confirmedUpload))).resolves.toMatchObject({ status: 201 });
    await expect(POST(request(confirmedUpload))).resolves.toMatchObject({ status: 201 });

    expect(mocks.createSnapshot).toHaveBeenCalledTimes(2);
    expect(mocks.createSnapshot).toHaveBeenLastCalledWith({
      studentId: "student-1",
      weekOf: "2026-09-14",
      lrAccuracyByType: { "Main Point": 0.72 },
      lrTopPriorityLogicTypes: ["Sufficient Assumption"],
      status: "approved",
      approvedAt: new Date("2026-09-14T16:00:00.000Z"),
      extraction: {
        source: "7sage_screenshot",
        extractedAt: new Date("2026-09-14T15:00:00.000Z"),
      },
      confirmation: {
        extractedValuesMatch: true,
        isLatestAnalytics: true,
        confirmedAt: new Date("2026-09-14T15:05:00.000Z"),
      },
    });
  });

  it("ignores a schedule test date in an analytics upload", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await expect(POST(request({ ...confirmedUpload, scheduleTestDate: "2026-09-21" }))).resolves.toMatchObject({ status: 201 });

    expect(mocks.createSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      weekOf: "2026-09-14",
      approvedAt: new Date("2026-09-14T16:00:00.000Z"),
    }));
    vi.unstubAllEnvs();
  });

  it("approves a screenshot on the real date for the admin's own student side", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.findStudent.mockImplementation(async ({ userId }) => userId === "admin-1" ? { _id: "admin-student" } : null);

    const response = await POST(request({ ...confirmedUpload, studentId: "someone-else" }));

    expect(response.status).toBe(201);
    expect(mocks.createSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      studentId: "admin-student",
      weekOf: "2026-09-14",
      approvedAt: new Date("2026-09-14T16:00:00.000Z"),
      status: "approved",
    }));
  });

  it.each([
    ["unconfirmed", { ...confirmedUpload, confirmation: { ...confirmedUpload.confirmation, isLatestAnalytics: false } }],
    ["empty", { ...confirmedUpload, lrAccuracyByType: {}, lrTopPriorityLogicTypes: [] }],
    [
      "stale",
      { ...confirmedUpload, extraction: { ...confirmedUpload.extraction, extractedAt: "2026-09-13T15:59:59.999Z" } },
    ],
  ])("rejects a %s upload without persisting it", async (_description, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(422);
    expect(mocks.createSnapshot).not.toHaveBeenCalled();
  });
});
