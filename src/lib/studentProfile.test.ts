import { describe, expect, it } from "vitest";
import {
  dailyCapacityError,
  goalScoreError,
  minuteOptionsForHour,
  parseStudentProfile,
  studentProfileSchema,
} from "./studentProfile";
import { mockStudent } from "./mockData";
import { SEEDED_TEST_MONTHS } from "./testMonthsFixture";

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

  it("saves 7Sage when the input has no platform", () => {
    expect(studentProfileSchema.parse(mockStudent).platform).toBe("7Sage");
  });

  it.each(["LSAT Demon", "Other"])("rejects the %s platform", (platform) => {
    expect(studentProfileSchema.safeParse({ ...mockStudent, platform }).success).toBe(false);
  });

  it.each([
    ["equal to", 160],
    ["below", 155],
  ])("rejects a goal score %s the current score", (_, goalScore) => {
    const result = studentProfileSchema.safeParse({ ...mockStudent, currentScore: 160, goalScore });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["goalScore"], message: "Your goal must be higher than your current score, 160." }),
    ]);
  });
});

describe("practice-test day length", () => {
  const withSaturday = (minutes: number, accommodationMultiplier: 1 | 1.5 | 2) => ({
    ...mockStudent,
    accommodationMultiplier,
    dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, SATURDAY: minutes },
  });

  it.each([
    [135, 1, "Saturday needs at least 2 h 30 for a full practice test. Add time or pick another day."],
    [180, 1.5, "Saturday needs at least 3 h 15 for a full practice test. Add time or pick another day."],
    [210, 2, "Saturday needs at least 3 h 45 for a full practice test. Add time or pick another day."],
  ] as const)("refuses a %i-minute practice-test day at %sx time", (minutes, accommodation, message) => {
    const result = studentProfileSchema.safeParse(withSaturday(minutes, accommodation));

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ["preferredPracticeTestDay"], message })]);
  });

  it.each([
    [150, 1],
    [195, 1.5],
    [225, 2],
  ] as const)("accepts a %i-minute practice-test day at %sx time", (minutes, accommodation) => {
    expect(studentProfileSchema.safeParse(withSaturday(minutes, accommodation)).success).toBe(true);
  });

  it("checks only the practice-test day, not the shorter days around it", () => {
    expect(studentProfileSchema.safeParse({ ...withSaturday(150, 1), dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, MONDAY: 30 } }).success).toBe(true);
  });
});

describe("goalScoreError", () => {
  it.each([
    [160, 160, "Your goal must be higher than your current score, 160."],
    [165, 150, "Your goal must be higher than your current score, 165."],
    [150, 151, null],
  ])("returns the form message for current %i and goal %i", (currentScore, goalScore, message) => {
    expect(goalScoreError(currentScore, goalScore)).toBe(message);
  });
});

describe("parseStudentProfile", () => {
  it("accepts a goal test date the form offers on that day", () => {
    expect(parseStudentProfile({ ...mockStudent, goalTestDate: "2026-11-01" }, "2026-10-31", SEEDED_TEST_MONTHS).goalTestDate).toBe("2026-11-01");
  });

  it("accepts a month an Admin added to the list", () => {
    const added = [...SEEDED_TEST_MONTHS, "2027-08-01"];
    expect(parseStudentProfile({ ...mockStudent, goalTestDate: "2027-08-01" }, "2027-07-01", added).goalTestDate).toBe("2027-08-01");
  });

  it.each([
    ["has started", "2026-11-01", "2026-11-02"],
    ["is not a test month", "2026-12-01", "2026-10-18"],
  ])("rejects a goal test date that %s", (_, goalTestDate, today) => {
    expect(() => parseStudentProfile({ ...mockStudent, goalTestDate }, today, SEEDED_TEST_MONTHS)).toThrow("Choose an upcoming LSAT test month.");
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
