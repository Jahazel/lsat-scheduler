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
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent } }));
vi.mock("@/lib/currentWeeklySchedule", () => ({ loadOrGenerateCurrentWeek: mocks.loadCurrentWeek }));
vi.mock("@/lib/weeklyScheduleRepository", () => ({ mongooseCurrentWeekRepositories: {} }));
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
  });

  it("redirects admins before loading or generating a student schedule", async () => {
    await expect(DashboardPage()).rejects.toThrow("redirect:/admin");

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

    const markup = renderToStaticMarkup(await DashboardPage());

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

    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain("analytics uploader");
  });
});
