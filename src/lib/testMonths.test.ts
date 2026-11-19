import { describe, expect, it } from "vitest";
import { parseTestMonthPick, testMonthOptions } from "./testMonths";
import { SEEDED_TEST_MONTHS } from "./testMonthsFixture";

describe("testMonthOptions", () => {
  it("offers only test months after the given date, labelled by month and year", () => {
    expect(testMonthOptions(SEEDED_TEST_MONTHS, "2026-10-18")).toEqual([
      { value: "2026-11-01", label: "November 2026" },
      { value: "2027-01-01", label: "January 2027" },
      { value: "2027-02-01", label: "February 2027" },
      { value: "2027-04-01", label: "April 2027" },
      { value: "2027-06-01", label: "June 2027" },
    ]);
  });

  it("drops a test month on its first day", () => {
    expect(testMonthOptions(SEEDED_TEST_MONTHS, "2026-11-01").map((month) => month.value)).not.toContain("2026-11-01");
  });

  it("keeps a test month the day before it starts", () => {
    expect(testMonthOptions(SEEDED_TEST_MONTHS, "2026-10-31")[0].value).toBe("2026-11-01");
  });

  it("offers nothing after the last month on the list", () => {
    expect(testMonthOptions(SEEDED_TEST_MONTHS, "2027-06-01")).toEqual([]);
  });

  it("offers a month an Admin added once the date is before it", () => {
    expect(testMonthOptions([...SEEDED_TEST_MONTHS, "2027-08-01"], "2027-06-01")).toEqual([{ value: "2027-08-01", label: "August 2027" }]);
  });
});

describe("parseTestMonthPick", () => {
  it("reads a month and year as the first of that month", () => {
    expect(parseTestMonthPick({ month: "8", year: "2027" })).toBe("2027-08-01");
  });

  it.each([
    [{ month: "13", year: "2027" }],
    [{ month: "0", year: "2027" }],
    [{ month: "8", year: "27" }],
    [{ month: null, year: "2027" }],
    [{ month: "8.5", year: "2027" }],
  ])("refuses %o", (pick) => {
    expect(parseTestMonthPick(pick)).toBeNull();
  });
});
