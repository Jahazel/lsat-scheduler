import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { mockStudent } from "@/lib/mockData";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  findStudent: vi.fn(),
  loadCurrentWeek: vi.fn(),
  listForSchedules: vi.fn(),
  listScheduleHistory: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent } }));
vi.mock("@/lib/currentWeeklySchedule", () => ({
  loadOrGenerateCurrentWeek: mocks.loadCurrentWeek,
  plannedActivityMinutes: (activity: { minutes: number }) => activity.minutes,
  scheduleActivityId: (day: string, index: number) => `${day}:${index}`,
}));
vi.mock("@/lib/weeklyScheduleRepository", () => ({
  mongooseCurrentWeekRepositories: {},
  listWeeklySchedulesForStudent: mocks.listScheduleHistory,
}));
vi.mock("@/lib/activityCheckInRepository", () => ({
  mongooseActivityCheckIns: { listForSchedules: mocks.listForSchedules },
}));
vi.mock("@/components/ScheduleCheckInView", () => ({
  default: ({ scheduleId, heading }: { scheduleId: string; heading?: string }) => <div>{scheduleId} {heading ?? "Your plan for this week"}</div>,
}));
vi.mock("./AnalyticsUploader", () => ({ default: () => <div>analytics uploader</div> }));
vi.mock("./ResetTestAccountButton", () => ({ default: () => <div>reset test account</div> }));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.listForSchedules.mockResolvedValue([]);
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

  it("renders the history rail with its stats when a past week exists", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "student-1", role: "student", name: "Student" } });
    mocks.findStudent.mockReturnValue({ lean: vi.fn().mockResolvedValue(studentRecord()) });
    mocks.loadCurrentWeek.mockResolvedValue(currentSchedule());
    mocks.listScheduleHistory.mockResolvedValue([
      persistedSchedule("current-schedule", "2026-09-21"),
      persistedSchedule("past-schedule", "2026-09-14"),
    ]);
    mocks.listForSchedules.mockResolvedValue([
      { scheduleId: "past-schedule", activityId: "MONDAY:0", status: "completed" },
    ]);

    const markup = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain("How it&#x27;s going");
    expect(markup).toContain("Avg. done");
    expect(markup).toContain("September 14");
    expect(markup).toContain("This week");
    expect(markup).toContain('aria-current="page"');
  });

  it("replaces the current plan with a selected past week", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "student-1", role: "student", name: "Student" } });
    mocks.findStudent.mockReturnValue({ lean: vi.fn().mockResolvedValue(studentRecord()) });
    mocks.loadCurrentWeek.mockResolvedValue(currentSchedule());
    mocks.listScheduleHistory.mockResolvedValue([
      persistedSchedule("current-schedule", "2026-09-21"),
      persistedSchedule("past-schedule", "2026-09-14"),
    ]);

    const markup = renderToStaticMarkup(await DashboardPage({
      searchParams: Promise.resolve({ historyWeek: "2026-09-14" }),
    }));

    expect(markup).toContain("Viewing a past week");
    expect(markup).toContain("past-schedule Your past plan");
    expect(markup).not.toContain("current-schedule Your plan for this week");
  });

  it("does not render the rail without past weeks", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "student-1", role: "student", name: "Student" } });
    mocks.findStudent.mockReturnValue({ lean: vi.fn().mockResolvedValue(studentRecord()) });
    mocks.loadCurrentWeek.mockResolvedValue(currentSchedule());

    const markup = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(markup).not.toContain("How it&#x27;s going");
    expect(markup).not.toContain("Your weeks");
  });
});

function studentRecord() {
  return {
    _id: "student-record-1",
    platform: "7Sage",
    currentScore: 150,
    goalScore: 160,
    dailyCapacityMinutes: mockStudent.dailyCapacityMinutes,
    preferredPracticeTestDay: "SATURDAY",
    accommodationMultiplier: 1,
    goalTestDate: "2026-12-01",
  };
}

function weeklySchedule(weekOf: string) {
  return {
    studentName: "Student",
    weekOf,
    days: {
      MONDAY: { day: "MONDAY", type: "drill", activities: [{ kind: "REVIEW", label: "Review", minutes: 30 }], totalMinutes: 30 },
      TUESDAY: { day: "TUESDAY", type: "rest", activities: [], totalMinutes: 0 },
      WEDNESDAY: { day: "WEDNESDAY", type: "rest", activities: [], totalMinutes: 0 },
      THURSDAY: { day: "THURSDAY", type: "rest", activities: [], totalMinutes: 0 },
      FRIDAY: { day: "FRIDAY", type: "rest", activities: [], totalMinutes: 0 },
      SATURDAY: { day: "SATURDAY", type: "rest", activities: [], totalMinutes: 0 },
      SUNDAY: { day: "SUNDAY", type: "rest", activities: [], totalMinutes: 0 },
    },
  };
}

function persistedSchedule(id: string, weekStartDate: string) {
  return {
    id,
    weekStartDate,
    schedule: weeklySchedule(weekStartDate),
    generationInputs: { student: {} },
  };
}

function currentSchedule() {
  return {
    kind: "schedule",
    schedule: {
      id: "current-schedule",
      weekStartDate: "2026-09-21",
      schedule: weeklySchedule("2026-09-21"),
      generationInputs: { student: {} },
    },
  };
}
