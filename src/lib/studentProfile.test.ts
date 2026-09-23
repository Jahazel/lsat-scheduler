import { describe, expect, it } from "vitest";
import { dailyCapacityError, studentProfileSchema } from "./studentProfile";
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
