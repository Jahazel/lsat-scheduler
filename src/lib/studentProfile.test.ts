import { describe, expect, it } from "vitest";
import {
  dailyCapacityError,
  goalScoreError,
  minuteOptionsForHour,
  parseStudentProfile,
  studentProfileSchema,
  upcomingTestMonths,
} from "./studentProfile";
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

  it("saves 7Sage when the input has no platform", () => {
    const { platform, ...withoutPlatform } = mockStudent;
    void platform;

    expect(studentProfileSchema.parse(withoutPlatform).platform).toBe("7Sage");
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

describe("goalScoreError", () => {
  it.each([
    [160, 160, "Your goal must be higher than your current score, 160."],
    [165, 150, "Your goal must be higher than your current score, 165."],
    [150, 151, null],
  ])("returns the form message for current %i and goal %i", (currentScore, goalScore, message) => {
    expect(goalScoreError(currentScore, goalScore)).toBe(message);
  });
});

describe("upcomingTestMonths", () => {
  it("offers only test months after the given date, labelled by month and year", () => {
    expect(upcomingTestMonths("2026-10-18")).toEqual([
      { value: "2026-11-01", label: "November 2026" },
      { value: "2027-01-01", label: "January 2027" },
      { value: "2027-02-01", label: "February 2027" },
      { value: "2027-04-01", label: "April 2027" },
      { value: "2027-06-01", label: "June 2027" },
    ]);
  });

  it("drops a test month on its first day", () => {
    expect(upcomingTestMonths("2026-11-01").map((month) => month.value)).not.toContain("2026-11-01");
  });

  it("keeps a test month the day before it starts", () => {
    expect(upcomingTestMonths("2026-10-31")[0].value).toBe("2026-11-01");
  });

  it("offers nothing after the last known test month", () => {
    expect(upcomingTestMonths("2027-06-01")).toEqual([]);
  });
});

describe("parseStudentProfile", () => {
  it("accepts a goal test date the form offers on that day", () => {
    expect(parseStudentProfile({ ...mockStudent, goalTestDate: "2026-11-01" }, "2026-10-31").goalTestDate).toBe("2026-11-01");
  });

  it.each([
    ["has started", "2026-11-01", "2026-11-02"],
    ["is not a test month", "2026-12-01", "2026-10-18"],
  ])("rejects a goal test date that %s", (_, goalTestDate, today) => {
    expect(() => parseStudentProfile({ ...mockStudent, goalTestDate }, today)).toThrow("Choose an upcoming LSAT test month.");
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
