import { describe, expect, it } from "vitest";
import { mockAnalytics, mockStudent } from "@/lib/mockData";
import { openWeeklyUpload } from "@/lib/weeklyUpload";
import { previewPlannedWeek } from "@/lib/weeklyUploadPreview";
import { weekSummary, weekTiles } from "./weeklyUploadText";

const saturday = new Date("2026-10-03T15:00:00.000Z");
const wednesday = new Date("2026-10-07T15:00:00.000Z");

function basisAt(now: Date) {
  const basis = openWeeklyUpload({ clock: { now, real: now, simulated: false }, student: mockStudent, schedules: [], snapshots: [] });
  if (!basis) throw new Error("Expected the weekly upload to be open");
  return basis;
}

describe("previewPlannedWeek", () => {
  const preview = (now: Date) => previewPlannedWeek(basisAt(now), { ...mockAnalytics, weekOf: "2026-10-05" }, 150);

  it("on a weekday, leaves the days before today unscheduled and shows only today to Sunday", () => {
    const schedule = preview(wednesday);
    expect(["MONDAY", "TUESDAY"].map((day) => schedule.days[day as "MONDAY"].activities)).toEqual([[], []]);
    expect(["WEDNESDAY", "THURSDAY", "FRIDAY"].some((day) => schedule.days[day as "MONDAY"].activities.length > 0)).toBe(true);
    expect(weekTiles(schedule, "WEDNESDAY").map(({ label }) => label)).toEqual(["Wed 7", "Thu 8", "Fri 9", "Sat 10", "Sun 11"]);
    expect(weekSummary(schedule, "WEDNESDAY")).toMatch(/^Oct 7–11 · /);
  });

  it("from Saturday, previews all seven days of next week", () => {
    const schedule = preview(saturday);
    expect(weekTiles(schedule, "MONDAY")).toHaveLength(7);
    expect(weekSummary(schedule, "MONDAY")).toMatch(/^Oct 5–11 · /);
  });
});
