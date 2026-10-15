import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findAccountById: vi.fn(),
  connectDB: vi.fn(),
  findStudent: vi.fn(),
  createSnapshot: vi.fn(),
}));

vi.mock("@/lib/accountRepository", () => ({ findAccountById: mocks.findAccountById }));

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
    mocks.findAccountById.mockResolvedValue({ role: "admin" });
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
 it("accepts today's screenshot while recording the admin's simulated approval date", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.findAccountById.mockResolvedValue({ role: "admin", simulatedDate: "2026-10-07" });
    const response = await POST(request(confirmedUpload));
    expect(response.status).toBe(201);
    expect(mocks.createSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      weekOf: "2026-10-07", approvedAt: new Date("2026-10-07T16:00:00.000Z"),
    }));
  });


  it.each(["student", "stale-admin"])("rejects an admin sample from a %s", async (role) => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: role === "student" ? "student" : "admin" } });
    mocks.findAccountById.mockResolvedValue({ role: "student" });
    const response = await POST(request({ ...confirmedUpload, extraction: { ...confirmedUpload.extraction, source: "admin_sample" } }));
    expect(response.status).toBe(403);
    expect(mocks.createSnapshot).not.toHaveBeenCalled();
  });

  it("approves a reviewed sample on the admin's simulated date", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.findAccountById.mockResolvedValue({ role: "admin", simulatedDate: "2026-10-07" });
    expect((await POST(request({ ...confirmedUpload, extraction: { ...confirmedUpload.extraction, source: "admin_sample" } }))).status).toBe(201);
    expect(mocks.createSnapshot).toHaveBeenCalledWith(expect.objectContaining({ weekOf: "2026-10-07", approvedAt: new Date("2026-10-07T16:00:00Z"), extraction: expect.objectContaining({ source: "admin_sample" }) }));
  });
  it("asks for a new sample when an admin approves a sample older than 24 hours", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    const response = await POST(request({
      ...confirmedUpload,
      extraction: { source: "admin_sample", extractedAt: "2026-09-13T15:59:59.999Z" },
    }));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Generate a new sample analytics snapshot before saving." });
    expect(mocks.createSnapshot).not.toHaveBeenCalled();
  });
  it("records the simulated calendar date when Chicago's evening falls on tomorrow in UTC", async () => {
    vi.setSystemTime(new Date("2026-09-15T03:00:00Z"));
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.findAccountById.mockResolvedValue({ role: "admin", simulatedDate: "2026-10-07" });
    expect((await POST(request(confirmedUpload))).status).toBe(201);
    expect(mocks.createSnapshot).toHaveBeenCalledWith(expect.objectContaining({ weekOf: "2026-10-07", approvedAt: new Date("2026-10-08T03:00:00Z") }));
  });
  it.each([["admin_sample", 201], ["7sage_screenshot", 422]])("handles a browser clock behind extraction for %s", async (source, status) => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    const response = await POST(request({
      ...confirmedUpload,
      extraction: { source, extractedAt: "2026-09-14T15:59:00.000Z" },
      confirmation: { ...confirmedUpload.confirmation, confirmedAt: "2026-09-14T15:58:00.000Z" },
    }));
    expect(response.status).toBe(status);
    if (status === 422) expect(mocks.createSnapshot).not.toHaveBeenCalled();
  });

});
