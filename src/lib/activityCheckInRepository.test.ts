import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWeek } from "./engine";
import { mockStudent, mockRules, mockAnalytics } from "./mockData";
import type { PersistedWeeklySchedule } from "./types";
const mocks = vi.hoisted(() => ({ updateOne: vi.fn(() => ({ exec: async () => ({}) })) }));
vi.mock("@/models/ActivityCheckIn", () => ({ ActivityCheckInModel: { updateOne: mocks.updateOne } }));
import { mongooseActivityCheckIns } from "./activityCheckInRepository";
const schedule: PersistedWeeklySchedule = {
  id: "schedule-1", studentId: "student-1", weekStartDate: "2026-10-05",
  generatedAt: "2026-10-07T12:00:00.000Z",
  schedule: generateWeek(mockStudent, mockAnalytics, mockRules, "Student"),
  sourceSnapshotIds: [], generationInputs: { student: mockStudent, timezone: "America/Chicago", remainingDays: [], analytics: mockAnalytics, priorWeekProgress: { source: "unavailable", skippedPlannedMinutes: 0, totalPlannedMinutes: 0, skipShare: 0, workloadReductionPercent: 0 } }, policyVersion: "test",
};
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe("new activity check-in timestamps", () => {
  it("uses actual creation time for ordinary students even for an older saved schedule", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T18:00:00.000Z"));
    await mongooseActivityCheckIns.ensureForSchedule(schedule);
    expect(mocks.updateOne).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ $setOnInsert: expect.objectContaining({ createdAt: new Date("2026-10-09T18:00:00.000Z") }) }), expect.anything());
  });
  it("uses the explicit simulated timestamp for admin check-ins", async () => {
    await mongooseActivityCheckIns.ensureForSchedule(schedule, new Date(schedule.generatedAt));
    expect(mocks.updateOne).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ $setOnInsert: expect.objectContaining({ createdAt: new Date("2026-10-07T12:00:00.000Z") }) }), expect.anything());
  });

});
