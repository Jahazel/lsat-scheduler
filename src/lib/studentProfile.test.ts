import { describe, expect, it } from "vitest";
import { dailyCapacityError, minuteOptionsForHour, studentProfileSchema } from "./studentProfile";
import { mockStudent } from "./mockData";

describe("studentProfileSchema", () => {
  it("accepts a daily capacity for each day and a preferred practice-test day", () => {
    const result = studentProfileSchema.safeParse({
      ...mockStudent,
      dailyCapacityMinutes: {
        MONDAY: 30,
        TUESDAY: 45,
        WEDNESDAY: 90,
        THURSDAY: 135,
        FRIDAY: 60,
        SATURDAY: 480,
        SUNDAY: 150,
      },
      preferredPracticeTestDay: "SUNDAY",
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ["under 30 minutes", 15],
    ["zero", 0],
    ["over 8 hours", 495],
    ["off the 15-minute step", 100],
  ])("rejects a daily capacity %s", (_, minutes) => {
    const result = studentProfileSchema.safeParse({
      ...mockStudent,
      dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, WEDNESDAY: minutes },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a profile missing a day's capacity", () => {
    const { FRIDAY, ...sixDays } = mockStudent.dailyCapacityMinutes;
    void FRIDAY;

    expect(studentProfileSchema.safeParse({ ...mockStudent, dailyCapacityMinutes: sixDays }).success).toBe(false);
  });

  it.each([[""], [undefined], ["FUNDAY"]])("rejects a preferred practice-test day of %j", (day) => {
    const result = studentProfileSchema.safeParse({ ...mockStudent, preferredPracticeTestDay: day });

    expect(result.success).toBe(false);
  });

  it("rejects the replaced weekday and weekend hours in place of daily capacity", () => {
    const { dailyCapacityMinutes, ...rest } = mockStudent;
    void dailyCapacityMinutes;

    expect(studentProfileSchema.safeParse({ ...rest, weekdayHours: 2, weekendHours: 4 }).success).toBe(false);
  });
});

describe("dailyCapacityError", () => {
  it.each([
    [15, "Enter at least 30 min."],
    [0, "Enter at least 30 min."],
    [495, "Enter 8 h or less."],
    [30, null],
    [480, null],
  ])("returns the form message for %i minutes", (minutes, message) => {
    expect(dailyCapacityError(minutes)).toBe(message);
  });
});

describe("minuteOptionsForHour", () => {
  it("excludes :00 and :15 at the lowest hour, since those would be below the daily minimum", () => {
    expect(minuteOptionsForHour(0)).toEqual([30, 45]);
  });

  it("excludes :15, :30, :45 at the highest hour, since those would be over the daily maximum", () => {
    expect(minuteOptionsForHour(8)).toEqual([0]);
  });

  it.each([1, 2, 3, 4, 5, 6, 7])("offers all four minute steps at hour %i", (hour) => {
    expect(minuteOptionsForHour(hour)).toEqual([0, 15, 30, 45]);
  });
});
