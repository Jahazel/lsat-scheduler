import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";
import type { ActivityCheckIn, PersistedWeeklySchedule } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findSchedule: vi.fn(),
  save: vi.fn(),
  studentSideNow: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/studentRepository", () => ({ findStudentByAccountId: async () => ({ id: "student-1" }) }));
vi.mock("@/lib/weeklyScheduleRepository", () => ({ findWeeklyScheduleForStudent: mocks.findSchedule }));
vi.mock("@/lib/activityCheckInRepository", () => ({ postgresActivityCheckIns: { save: mocks.save } }));
vi.mock("@/lib/studentClock", () => ({ studentSideNow: mocks.studentSideNow }));

import { saveActivityCheckIn } from "./actions";

const scheduleId = "5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f";
const input = { scheduleId, activityId: "MONDAY:0", status: "completed" } as const;

function scheduleForWeek(weekStartDate: string) {
  return { id: scheduleId, weekStartDate, schedule: generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName) } as PersistedWeeklySchedule;
}

describe("saveActivityCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "account-1", role: "student" } });
    mocks.studentSideNow.mockResolvedValue(new Date("2026-10-07T15:00:00.000Z"));
    mocks.save.mockImplementation(async (checkIn: Omit<ActivityCheckIn, "id">) => ({ id: "saved", ...checkIn }));
  });

  it("saves a check-in for this week's schedule", async () => {
    mocks.findSchedule.mockResolvedValue(scheduleForWeek("2026-10-05"));
    await expect(saveActivityCheckIn(input)).resolves.toMatchObject(input);
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it.each(["2026-09-28", "2026-10-12"])("refuses a check-in for the week of %s with an error code", async (weekStartDate) => {
    mocks.findSchedule.mockResolvedValue(scheduleForWeek(weekStartDate));
    expect(await saveActivityCheckIn(input)).toEqual({ unexpectedFailure: expect.stringMatching(/^[0-9a-f]{8}$/) });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("follows the admin test clock to decide this week", async () => {
    mocks.studentSideNow.mockResolvedValue(new Date("2026-09-30T15:00:00.000Z"));
    mocks.findSchedule.mockResolvedValue(scheduleForWeek("2026-09-28"));
    await expect(saveActivityCheckIn(input)).resolves.toMatchObject(input);

    mocks.findSchedule.mockResolvedValue(scheduleForWeek("2026-10-05"));
    expect(await saveActivityCheckIn(input)).toEqual({ unexpectedFailure: expect.stringMatching(/^[0-9a-f]{8}$/) });
  });
});
