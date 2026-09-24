import { describe, expect, it } from "vitest";
import { testCountdown, testCountdownLabel } from "./testCountdown";

const tz = "America/Chicago";
const now = new Date("2026-09-23T15:00:00.000Z");

describe("testCountdown", () => {
  it("counts whole days to a future test date", () => {
    expect(testCountdown("2026-10-05", now, tz)).toEqual({ kind: "days", days: 12 });
  });

  it("reports test day on the day", () => {
    expect(testCountdown("2026-09-23", now, tz)).toEqual({ kind: "today" });
  });

  it("reports nothing once the date has passed", () => {
    expect(testCountdown("2026-09-22", now, tz)).toBeNull();
  });

  it("uses the schedule timezone's calendar day, not UTC", () => {
    expect(testCountdown("2026-09-22", new Date("2026-09-23T02:00:00.000Z"), tz)).toEqual({ kind: "today" });
  });

  it("ignores an unparseable date", () => {
    expect(testCountdown("soon", now, tz)).toBeNull();
  });
});

describe("testCountdownLabel", () => {
  it("words each state", () => {
    expect(testCountdownLabel({ kind: "days", days: 12 })).toBe("12 days to test");
    expect(testCountdownLabel({ kind: "days", days: 1 })).toBe("1 day to test");
    expect(testCountdownLabel({ kind: "today" })).toBe("Test day");
    expect(testCountdownLabel(null)).toBeNull();
  });
});
