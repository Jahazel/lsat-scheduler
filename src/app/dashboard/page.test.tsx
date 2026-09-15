import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  findStudent: vi.fn(),
  loadCurrentWeek: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent } }));
vi.mock("@/lib/currentWeeklySchedule", () => ({ loadOrGenerateCurrentWeek: mocks.loadCurrentWeek }));
vi.mock("@/lib/weeklyScheduleRepository", () => ({ mongooseCurrentWeekRepositories: {} }));
vi.mock("@/lib/activityCheckInRepository", () => ({ mongooseActivityCheckIns: {} }));
vi.mock("@/components/ScheduleCheckInView", () => ({ default: () => null }));
vi.mock("./AnalyticsUploader", () => ({ default: () => null }));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
  });

  it("redirects admins before loading or generating a student schedule", async () => {
    await expect(DashboardPage()).rejects.toThrow("redirect:/admin");

    expect(mocks.findStudent).not.toHaveBeenCalled();
    expect(mocks.loadCurrentWeek).not.toHaveBeenCalled();
  });
});
