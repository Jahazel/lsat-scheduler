import { describe, expect, it } from "vitest";
import { DAY_ORDER } from "./engine";
import { mockAnalytics, mockStudent } from "./mockData";
import {
  buildLabWeek, copiedInputs, encodeLabLink, fieldErrors, hasErrors, labWeeks, presetInputs, presets, readLabLink, staleReason, weekReasons,
  type CopiedStudent, type LabInputs,
} from "./scheduleLab";

const THIS_WEEK = "2026-11-16";
const steady = presetInputs("steady", THIS_WEEK);
const maya: CopiedStudent = { id: "s1", name: "Maya Thompson", uploadedOn: "2026-11-13", trend: { ...mockAnalytics, rcTypesInNewestSnapshot: [] } };

describe("presets", () => {
  it("offers three sample directions and three edge cases", () => {
    expect(presets(THIS_WEEK).map((p) => `${p.group}: ${p.label}`)).toEqual([
      "Sample directions: Improving", "Sample directions: Steady", "Sample directions: Slipping",
      "Edge cases: 2× time", "Edge cases: Test in 3 weeks", "Edge cases: 30 min days",
    ]);
  });

  it("starts on Steady this week, with a test about two months away, and builds", () => {
    expect(steady).toMatchObject({ preset: "steady", weekOf: THIS_WEEK, current: "150", goal: "165", testMonth: "2027-02-01" });
    const week = buildLabWeek(steady, null);
    expect(week?.plannedFrom).toBe("Steady sample");
    expect(week?.schedule.weekOf).toBe(THIS_WEEK);
    expect(weekReasons(week!.schedule).map((r) => r.code)).not.toContain("near_test_week");
  });

  it("builds every preset", () => {
    for (const preset of presets(THIS_WEEK)) expect(buildLabWeek(preset.inputs, null), preset.label).not.toBeNull();
  });

  it("plans each sample direction from its own sample", () => {
    expect(buildLabWeek(presetInputs("slipping", THIS_WEEK), null)?.plannedFrom).toBe("Slipping sample");
  });

  it("Test in 3 weeks builds a near-test week with the second practice test and its reason", () => {
    const soon = presetInputs("soon", THIS_WEEK);
    expect(soon).toMatchObject({ weekOf: "2026-12-21", testMonth: "2027-01-01" });
    const schedule = buildLabWeek(soon, null)!.schedule;
    expect(DAY_ORDER.filter((day) => schedule.days[day].type === "practice_test")).toHaveLength(2);
    expect(weekReasons(schedule).find((r) => r.code === "near_test_week")?.sentence).toMatch(/2 LawHub practice tests before your January 1 test/);
  });

  it("Test in 3 weeks moves to the next test month once the near week has passed", () => {
    expect(presetInputs("soon", "2026-12-28")).toMatchObject({ weekOf: "2027-01-25", testMonth: "2027-02-01" });
  });

  it("falls back to Steady for an unknown preset", () => {
    expect(presetInputs("nope", THIS_WEEK)).toEqual(steady);
  });
});

describe("field errors", () => {
  it("an out-of-range goal gets the live field error and builds no week", () => {
    const typo: LabInputs = { ...steady, goal: "20" };
    const errors = fieldErrors(typo);
    expect(errors.goal).toBe("LSAT scores go from 120 to 180. Check your goal score.");
    expect(buildLabWeek(typo, null)).toBeNull();
    expect(staleReason(errors)).toBe("Fix the goal score.");
  });

  it("names every field that needs a fix", () => {
    const errors = fieldErrors({ ...steady, current: "", goal: "", testMonth: "2026-11-01" });
    expect(hasErrors(errors)).toBe(true);
    expect(staleReason(errors)).toBe("Fix the current PT score, goal score, goal test month.");
  });

  it("refuses a practice-test day too short for the test", () => {
    const errors = fieldErrors({ ...steady, days: { ...steady.days, SATURDAY: 30 } });
    expect(errors.days.SATURDAY).toBeTruthy();
    expect(staleReason(errors)).toBe("Fix the study time.");
  });

  it("has none for a preset", () => {
    expect(hasErrors(fieldErrors(steady))).toBe(false);
  });
});

describe("copy a student", () => {
  it("copies their inputs and plans from their upload", () => {
    const inputs = copiedInputs(mockStudent, maya, THIS_WEEK);
    expect(inputs).toMatchObject({
      preset: "student", copiedFrom: "s1", weekOf: THIS_WEEK, current: "160", goal: "170", testMonth: "2027-01-01",
      days: mockStudent.dailyCapacityMinutes, ptDay: "SATURDAY", analytics: { kind: "student" },
    });
    const week = buildLabWeek(inputs, maya)!;
    expect(week.plannedFrom).toBe("Maya Thompson's latest upload");
    expect(week.schedule.weekOf).toBe(THIS_WEEK);
  });

  it("starts from Steady for a student without analytics", () => {
    expect(copiedInputs(mockStudent, { ...maya, trend: null }, THIS_WEEK)).toEqual({ ...steady, copiedFrom: "s1" });
  });
});

describe("page link", () => {
  it("reopens the same inputs", () => {
    const edited: LabInputs = { ...presetInputs("double", THIS_WEEK), goal: "17", copiedFrom: "s1", analytics: { kind: "student" } };
    expect(readLabLink(encodeLabLink(edited), THIS_WEEK)).toEqual(edited);
  });

  it("keeps characters outside Latin-1 and stays link safe", () => {
    const link = encodeLabLink({ ...steady, copiedFrom: "学生-é" });
    expect(link).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(readLabLink(link, THIS_WEEK)?.copiedFrom).toBe("学生-é");
  });

  it.each([
    ["empty", ""],
    ["not base64 JSON", "not-a-lab-link"],
    ["JSON of the wrong shape", btoa(JSON.stringify({ preset: "steady" }))],
    ["an unknown direction", encodeLabLink({ ...steady, analytics: { kind: "sample", direction: "sideways" as "steady" } })],
    ["a student upload with no student", encodeLabLink({ ...steady, analytics: { kind: "student" } })],
    ["a week the lab no longer offers", encodeLabLink({ ...steady, weekOf: "2026-11-09" })],
  ])("cannot read %s", (_, link) => {
    expect(readLabLink(link, THIS_WEEK)).toBeNull();
  });
});

describe("weeks", () => {
  it("offers 26 Mondays from this week", () => {
    const weeks = labWeeks(THIS_WEEK);
    expect(weeks).toHaveLength(26);
    expect(weeks[0]).toEqual({ value: THIS_WEEK, label: "Week of Nov 16" });
    expect(weeks[1]!.value).toBe("2026-11-23");
  });
});
