import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  findStudent: vi.fn(),
  loadCurrentWeek: vi.fn(),
  listForSchedule: vi.fn(),
  listScheduleHistory: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent } }));
vi.mock("@/lib/currentWeeklySchedule", () => ({ loadOrGenerateCurrentWeek: mocks.loadCurrentWeek }));
vi.mock("@/lib/weeklyScheduleRepository", () => ({
  mongooseCurrentWeekRepositories: {},
  listWeeklySchedulesForStudent: mocks.listScheduleHistory,
}));
vi.mock("@/lib/activityCheckInRepository", () => ({
  mongooseActivityCheckIns: { listForSchedule: mocks.listForSchedule },
}));
vi.mock("@/components/ScheduleCheckInView", () => ({ default: () => <div>schedule</div> }));
vi.mock("./AnalyticsUploader", () => ({ default: () => <div>analytics uploader</div> }));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.listForSchedule.mockResolvedValue([]);
    mocks.listScheduleHistory.mockResolvedValue([]);
  });

  it("redirects admins before loading or generating a student schedule", async () => {
    await expect(DashboardPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/admin");

    expect(mocks.findStudent).not.toHaveBeenCalled();
    expect(mocks.loadCurrentWeek).not.toHaveBeenCalled();
  });

  it("hides analytics upload once the current-week schedule exists", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "student-1", role: "student", name: "Student" } });
    mocks.findStudent.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "student-record-1",
        platform: "7Sage",
        currentScore: 150,
        goalScore: 160,
        weekdayHours: 2,
        weekendHours: 4,
        accommodationMultiplier: 1,
        goalTestDate: "2026-12-01",
      }),
    });
    mocks.loadCurrentWeek.mockResolvedValue({
      kind: "schedule",
      schedule: {
        id: "schedule-1",
        schedule: {},
        generationInputs: { student: {} },
      },
    });

    const markup = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain("schedule");
    expect(markup).not.toContain("analytics uploader");
  });

  it("shows analytics upload when approved analytics are required to create a schedule", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "student-1", role: "student", name: "Student" } });
    mocks.findStudent.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "student-record-1",
        platform: "7Sage",
        currentScore: 150,
        goalScore: 160,
        weekdayHours: 2,
        weekendHours: 4,
        accommodationMultiplier: 1,
        goalTestDate: "2026-12-01",
      }),
    });
    mocks.loadCurrentWeek.mockResolvedValue({ kind: "analytics_required" });

    const markup = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain("analytics uploader");
  });

  it("uses a selected test date only during local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.auth.mockResolvedValue({ user: { id: "student-1", role: "student", name: "Student" } });
    mocks.findStudent.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "student-record-1",
        platform: "7Sage",
        currentScore: 150,
        goalScore: 160,
        weekdayHours: 2,
        weekendHours: 4,
        accommodationMultiplier: 1,
        goalTestDate: "2026-12-01",
      }),
    });
    mocks.loadCurrentWeek.mockResolvedValue({ kind: "analytics_required" });

    const markup = renderToStaticMarkup(await DashboardPage({
      searchParams: Promise.resolve({ scheduleTestDate: "2026-09-21" }),
    }));

    expect(markup).toContain("Schedule test date");
    expect(mocks.loadCurrentWeek.mock.calls[0][0].now().toISOString()).toBe("2026-09-21T12:00:00.000Z");
    vi.unstubAllEnvs();
  });
});
