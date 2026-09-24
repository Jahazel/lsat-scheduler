import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { mockStudent } from "@/lib/mockData";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  findStudent: vi.fn(),
  listScheduleHistory: vi.fn(),
  listForSchedules: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: mocks.findStudent } }));
vi.mock("@/lib/currentWeeklySchedule", () => ({
  currentWeekInTimezone: () => "2026-09-21",
  plannedActivityMinutes: (activity: { minutes: number }) => activity.minutes,
  scheduleActivityId: (day: string, index: number) => `${day}:${index}`,
}));
vi.mock("@/lib/weeklyScheduleRepository", () => ({ listWeeklySchedulesForStudent: mocks.listScheduleHistory }));
vi.mock("@/lib/activityCheckInRepository", () => ({
  mongooseActivityCheckIns: { listForSchedules: mocks.listForSchedules },
}));
vi.mock("@/components/ScheduleCheckInView", () => ({
  default: ({ scheduleId, heading }: { scheduleId: string; heading?: string }) => <div>{scheduleId} {heading}</div>,
}));

import ProgressPage from "./page";

const render = async (searchParams: { week?: string } = {}) =>
  renderToStaticMarkup(await ProgressPage({ searchParams: Promise.resolve(searchParams) }));

describe("ProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "student-1", role: "student" } });
    mocks.findStudent.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "student-record-1", ...mockStudent }) });
    mocks.listForSchedules.mockResolvedValue([]);
    mocks.listScheduleHistory.mockResolvedValue([]);
  });

  it("redirects admins away", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    await expect(render()).rejects.toThrow("redirect:/admin");
  });

  it("explains the empty state when only the current week exists", async () => {
    mocks.listScheduleHistory.mockResolvedValue([persistedSchedule("current-schedule", "2026-09-21")]);

    const markup = await render();

    expect(markup).toContain("No finished weeks yet.");
    expect(markup).not.toContain("Avg. done");
  });

  it("lists past weeks with stats", async () => {
    mocks.listScheduleHistory.mockResolvedValue([
      persistedSchedule("current-schedule", "2026-09-21"),
      persistedSchedule("past-schedule", "2026-09-14"),
    ]);
    mocks.listForSchedules.mockResolvedValue([{ scheduleId: "past-schedule", activityId: "MONDAY:0", status: "completed" }]);

    const markup = await render();

    expect(markup).toContain("Avg. done");
    expect(markup).toContain("September 14");
    expect(markup).toContain('href="/progress?week=2026-09-14"');
    expect(markup).not.toContain("September 21");
  });

  it("opens a past week inside Progress with a way back", async () => {
    mocks.listScheduleHistory.mockResolvedValue([
      persistedSchedule("current-schedule", "2026-09-21"),
      persistedSchedule("past-schedule", "2026-09-14"),
    ]);

    const markup = await render({ week: "2026-09-14" });

    expect(markup).toContain("← All weeks");
    expect(markup).toContain("Viewing a past week");
    expect(markup).toContain("past-schedule Your past plan");
  });

  it("sends the current week back to This week", async () => {
    await expect(render({ week: "2026-09-21" })).rejects.toThrow("redirect:/dashboard");
  });

  it("falls back to the overview for an unknown week", async () => {
    mocks.listScheduleHistory.mockResolvedValue([persistedSchedule("past-schedule", "2026-09-14")]);

    const markup = await render({ week: "1999-01-04" });

    expect(markup).toContain("Your weeks");
    expect(markup).not.toContain("Viewing a past week");
  });
});

function persistedSchedule(id: string, weekStartDate: string) {
  return {
    id,
    weekStartDate,
    schedule: {
      days: Object.fromEntries(
        ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => [
          day,
          { day, type: day === "MONDAY" ? "drill" : "rest", activities: day === "MONDAY" ? [{ kind: "REVIEW", label: "Review", minutes: 30 }] : [], totalMinutes: 0 },
        ]),
      ),
    },
    generationInputs: { student: {} },
  };
}
