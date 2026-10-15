import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { mockStudent } from "@/lib/mockData";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findAccountById: vi.fn(),
  ensureForSchedule: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  findStudent: vi.fn(),
  loadCurrentWeek: vi.fn(),
  listForSchedule: vi.fn(),
}));

vi.mock("@/lib/accountRepository", () => ({ findAccountById: mocks.findAccountById }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent } }));
vi.mock("@/lib/currentWeeklySchedule", () => ({
  currentWeekInTimezone: () => "2026-09-21",
  loadOrGenerateCurrentWeek: mocks.loadCurrentWeek,
  plannedActivityMinutes: (activity: { minutes: number }) => activity.minutes,
  scheduleActivityId: (day: string, index: number) => `${day}:${index}`,
}));
vi.mock("@/lib/weeklyScheduleRepository", () => ({ mongooseCurrentWeekRepositories: {} }));
vi.mock("@/lib/activityCheckInRepository", () => ({
  mongooseActivityCheckIns: { listForSchedule: mocks.listForSchedule, ensureForSchedule: mocks.ensureForSchedule },
}));
vi.mock("@/components/ScheduleCheckInView", () => ({
  default: ({ scheduleId, heading }: { scheduleId: string; heading?: string }) => <div>{scheduleId} {heading ?? "Your plan for this week"}</div>,
}));
vi.mock("./AnalyticsUploader", () => ({ default: () => <div>analytics uploader</div> }));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findAccountById.mockResolvedValue({ role: "admin" });
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.listForSchedule.mockResolvedValue([]);
  });

  it("sends an admin without a Student to onboarding", async () => {
    mocks.findStudent.mockReturnValue({ lean: async () => null });
    await expect(DashboardPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/onboarding");
    expect(mocks.findStudent).toHaveBeenCalledWith({ userId: "admin-1" });
  });

  it.each(["student", "admin"])("shows the %s their saved current-week schedule", async (role) => {
    mocks.auth.mockResolvedValue({ user: { id: "student-1", role, name: "Student" } });
    mocks.findStudent.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "student-record-1",
        platform: "7Sage",
        currentScore: 150,
        goalScore: 160,
        dailyCapacityMinutes: mockStudent.dailyCapacityMinutes,
        preferredPracticeTestDay: "SATURDAY",
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
        dailyCapacityMinutes: mockStudent.dailyCapacityMinutes,
        preferredPracticeTestDay: "SATURDAY",
        accommodationMultiplier: 1,
        goalTestDate: "2026-12-01",
      }),
    });
    mocks.loadCurrentWeek.mockResolvedValue({ kind: "analytics_required" });

    const markup = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain("analytics uploader");
  });

  it("sends old past-week links to Progress", async () => {
    await expect(DashboardPage({ searchParams: Promise.resolve({ historyWeek: "2026-09-14" }) }))
      .rejects.toThrow("redirect:/progress?week=2026-09-14");

    expect(mocks.loadCurrentWeek).not.toHaveBeenCalled();
  });
  it.each(["student", "admin", "stale-admin"])("limits simulated check-in creation timestamps for %s", async (role) => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: role === "student" ? "student" : "admin" } });
    mocks.findAccountById.mockResolvedValue({ role: role === "stale-admin" ? "student" : role, simulatedDate: "2026-10-07" });
    mocks.findStudent.mockReturnValue({ lean: async () => ({ _id: "student-1", ...mockStudent }) });
    const saved = { id: "schedule-1", generatedAt: "2026-10-07T12:00:00.000Z" };
    mocks.loadCurrentWeek.mockImplementationOnce(async ({ activityCheckIns }) => {
      await activityCheckIns.ensureForSchedule(saved);
      return { kind: "analytics_required" };
    });
    await DashboardPage({ searchParams: Promise.resolve({}) });
    expect(mocks.ensureForSchedule).toHaveBeenCalledWith(saved, role === "admin" ? new Date("2026-10-07T12:00:00.000Z") : undefined);
  });

});
