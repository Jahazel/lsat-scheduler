// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SCHEDULING_POLICY_VERSION } from "@/lib/currentWeeklySchedule";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";
import type { ReadOnlyCurrentWeekResult } from "@/lib/readOnlyCurrentWeekSchedule";
import type { ActivityCheckIn, PersistedWeeklySchedule } from "@/lib/types";

vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn: vi.fn() }));

import { ThisWeekPanel } from "./ThisWeekPanel";

afterEach(cleanup);

const schedule = generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);
const saved: PersistedWeeklySchedule = {
  id: "schedule-1", studentId: "student-1", weekStartDate: schedule.weekOf, generatedAt: "2026-08-24T12:00:00.000Z", schedule,
  sourceSnapshotIds: [], generationInputs: { student: mockStudent, timezone: "America/Los_Angeles", remainingDays: [], analytics: mockAnalytics },
  policyVersion: SCHEDULING_POLICY_VERSION,
};
const done = (...activityIds: string[]): ActivityCheckIn[] => activityIds.map((activityId) => ({ scheduleId: "schedule-1", activityId, status: "completed" }));

const show = (week: ReadOnlyCurrentWeekResult, today = "2026-08-24") => render(<ThisWeekPanel week={week} today={today} />);

describe("Student detail This week", () => {
  it("heads the read-only week as this week, with the count done and the pace", () => {
    show({ kind: "schedule", schedule: saved, checkIns: done("MONDAY:0") }, "2026-08-26");
    expect(screen.getByRole("heading", { level: 2, name: "Week of August 24" })).toBeTruthy();
    const total = Object.values(schedule.days).reduce((n, day) => n + day.activities.length, 0);
    const monday = schedule.days.MONDAY.activities.length + schedule.days.TUESDAY.activities.length;
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === `1 of ${total} done · ${monday - 1} behind`)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/next week|Your plan for/i);
    expect(screen.getByRole("heading", { name: /^Monday/ })).toBeTruthy();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it.each([
    [{ kind: "held_week" }, "This student's weekly schedule for this week is held. It appears when their first payment goes through."],
    [{ kind: "next_week_preview", weekStartDate: "2026-11-16" }, "This student has saved their plan for next week. It starts Monday, Nov 16."],
    [{ kind: "next_week_upload_confirmed", weekStartDate: "2026-11-16" },
      "This student has confirmed their upload for next week, which starts Monday, Nov 16. Their plan is saved when they open This week."],
    [{ kind: "analytics_required" }, "This student needs confirmed, eligible analytics before a current weekly schedule can be created."],
    [{ kind: "schedule_not_created" }, "No saved schedule exists for the current week. The student must open their dashboard to create it."],
  ] as const)("with no schedule this week (%o) shows the live message", (week, message) => {
    show(week);
    expect(screen.getByText("No schedule this week")).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /^Week of/ })).toBeNull();
  });
});
