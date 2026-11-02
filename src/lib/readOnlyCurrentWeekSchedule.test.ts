import { describe, expect, it } from "vitest";
import { adminScheduleStateMessage, loadReadOnlyCurrentWeek } from "./readOnlyCurrentWeekSchedule";
import { mockAnalytics, mockStudent } from "./mockData";
import type { ActivityCheckIn, ApprovedAnalyticsSnapshot, PersistedWeeklySchedule } from "./types";

const monday = new Date("2026-09-14T14:00:00.000Z");

const savedSchedule: PersistedWeeklySchedule = {
  id: "schedule-1",
  studentId: "student-1",
  weekStartDate: "2026-09-14",
  generatedAt: monday.toISOString(),
  schedule: { studentName: "Ada", weekOf: "2026-09-14", days: {} as PersistedWeeklySchedule["schedule"]["days"] },
  sourceSnapshotIds: ["snapshot-1"],
  generationInputs: {
    student: mockStudent,
    timezone: "America/Chicago",
    remainingDays: ["MONDAY"],
    analytics: mockAnalytics,
    priorWeekProgress: {
      source: "unavailable",
      skippedPlannedMinutes: 0,
      totalPlannedMinutes: 0,
      skipShare: 0,
      workloadReductionPercent: 0,
    },
  },
  policyVersion: "adaptive-weekly-schedule-v1",
};

const persistedCheckIns: ActivityCheckIn[] = [
  { id: "check-in-1", scheduleId: "schedule-1", activityId: "MONDAY:0", status: "completed" },
];

function repositories({
  schedule = null,
  snapshots = [],
  savedWeeks,
}: {
  schedule?: PersistedWeeklySchedule | null;
  snapshots?: ApprovedAnalyticsSnapshot[];
  savedWeeks?: string[];
} = {}) {
  return {
    weeklySchedules: {
      findByStudentAndWeek: async (_studentId: string, week: string) =>
        savedWeeks ? (savedWeeks.includes(week) ? { ...savedSchedule, weekStartDate: week } : null) : schedule,
    },
    snapshots: {
      listEligibleForStudent: async () => snapshots,
    },
    activityCheckIns: {
      listForSchedule: async () => persistedCheckIns,
    },
  };
}

describe("loadReadOnlyCurrentWeek", () => {
  it("returns the student's existing saved schedule and persisted check-ins without a generation capability", async () => {
    const result = await loadReadOnlyCurrentWeek({
      studentId: "student-1",
      timezone: "America/Chicago",
      now: () => monday,
      ...repositories({ schedule: savedSchedule }),
    });

    expect(result).toEqual({ kind: "schedule", schedule: savedSchedule, checkIns: persistedCheckIns });
  });

  it("reports that approved analytics are required when no current schedule or eligible snapshot exists", async () => {
    const result = await loadReadOnlyCurrentWeek({
      studentId: "student-1",
      timezone: "America/Chicago",
      now: () => monday,
      ...repositories(),
    });

    expect(result).toEqual({ kind: "analytics_required" });
    if (result.kind === "schedule") throw new Error("Expected an unmet analytics prerequisite");
    expect(adminScheduleStateMessage(result)).toBe(
      "This student needs confirmed, eligible analytics before a current weekly schedule can be created."
    );
  });

  it("does not create a schedule when the student has eligible analytics but no saved current-week record", async () => {
    const result = await loadReadOnlyCurrentWeek({
      studentId: "student-1",
      timezone: "America/Chicago",
      now: () => monday,
      ...repositories({ snapshots: [{ ...mockAnalytics, id: "snapshot-1", approvedAt: monday.toISOString() }] }),
    });

    expect(result).toEqual({ kind: "schedule_not_created" });
    if (result.kind === "schedule") throw new Error("Expected a missing saved schedule");
    expect(adminScheduleStateMessage(result)).toBe(
      "No saved schedule exists for the current week. The student must open their dashboard to create it."
    );
  });

  it.each([
    ["Saturday", "2026-09-19T15:00:00.000Z"],
    ["Sunday", "2026-09-20T15:00:00.000Z"],
  ])("reports a saved next-week preview on %s instead of asking for analytics", async (_day, at) => {
    const result = await loadReadOnlyCurrentWeek({
      studentId: "student-1",
      timezone: "America/Chicago",
      now: () => new Date(at),
      ...repositories({ savedWeeks: ["2026-09-21"] }),
    });

    expect(result).toEqual({ kind: "next_week_preview", weekStartDate: "2026-09-21" });
    if (result.kind === "schedule") throw new Error("Expected a next-week preview");
    expect(adminScheduleStateMessage(result)).toBe(
      "This student has saved their plan for next week. It starts Monday, Sep 21."
    );
  });

  it("ignores a saved next week from Monday to Friday", async () => {
    const result = await loadReadOnlyCurrentWeek({
      studentId: "student-1",
      timezone: "America/Chicago",
      now: () => monday,
      ...repositories({ savedWeeks: ["2026-09-21"] }),
    });

    expect(result).toEqual({ kind: "analytics_required" });
  });
});
