import { describe, expect, it } from "vitest";
import { calendarMonth } from "./walkthrough";

describe("calendarMonth", () => {
  it("lays the month out Monday first, in whole weeks", () => {
    const days = calendarMonth("2026-11-01", "2026-11-16", []);
    expect(days).toHaveLength(42);
    expect(days.slice(0, 6).every((day) => day.kind === "outside")).toBe(true);
    expect(days[6]).toMatchObject({ date: "2026-11-01" });
    expect(days[7]).toMatchObject({ date: "2026-11-02" });
    expect(days[35]).toMatchObject({ date: "2026-11-30" });
  });

  it("turns off past days and today, turns on days up to 56 days ahead, and marks weeks with a schedule", () => {
    const byDate = (first: string) => new Map(calendarMonth(first, "2026-11-16", ["2026-11-16", "2027-01-11"]).map((day) => [day.date, day]));
    const november = byDate("2026-11-01");
    expect(november.get("2026-11-15")).toEqual({ date: "2026-11-15", kind: "off", scheduled: false });
    expect(november.get("2026-11-16")).toEqual({ date: "2026-11-16", kind: "today", scheduled: true });
    expect(november.get("2026-11-22")).toEqual({ date: "2026-11-22", kind: "on", scheduled: true });
    expect(november.get("2026-11-23")).toEqual({ date: "2026-11-23", kind: "on", scheduled: false });
    const january = byDate("2027-01-01");
    expect(january.get("2027-01-11")).toEqual({ date: "2027-01-11", kind: "on", scheduled: true });
    expect(january.get("2027-01-12")).toEqual({ date: "2027-01-12", kind: "off", scheduled: true });
  });
});
