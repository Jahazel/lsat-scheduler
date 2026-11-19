import { describe, expect, it } from "vitest";
import { DAY_ORDER } from "./engine";
import { mockAnalytics, mockStudent } from "./mockData";
import {
  buildLabChain, chainEndText, copiedInputs, encodeLabLink, fieldErrors, hasErrors, labWeeks, presetInputs, presets, readLabLink, staleReason, weekReasons,
  showWeek, type CopiedStudent, type LabChain, type LabInputs, type LabRead,
} from "./scheduleLab";

import { SEEDED_TEST_MONTHS as MONTHS } from "./testMonthsFixture";

const THIS_WEEK = "2026-11-16";

const steady = presetInputs("steady", THIS_WEEK, MONTHS);
const firstWeek = (inputs: LabInputs, copied: CopiedStudent | null) => buildLabChain(inputs, MONTHS, copied)?.weeks[0] ?? null;
const maya: CopiedStudent = { id: "s1", name: "Maya Thompson", uploadedOn: "2026-11-13", trend: { ...mockAnalytics, rcTypesInNewestSnapshot: [] } };

describe("presets", () => {
  it("offers three sample directions and three edge cases", () => {
    expect(presets(THIS_WEEK, MONTHS).map((p) => `${p.group}: ${p.label}`)).toEqual([
      "Sample directions: Improving", "Sample directions: Steady", "Sample directions: Slipping",
      "Edge cases: 2× time", "Edge cases: Test in 3 weeks", "Edge cases: 30 min days",
    ]);
  });

  it("starts on Steady this week, with a test about two months away, and builds", () => {
    expect(steady).toMatchObject({ preset: "steady", weekOf: THIS_WEEK, current: "150", goal: "165", testMonth: "2027-02-01" });
    const week = firstWeek(steady, null);
    expect(week?.plannedFrom).toBe("Steady sample");
    expect(week?.schedule.weekOf).toBe(THIS_WEEK);
    expect(weekReasons(week!.schedule).map((r) => r.code)).not.toContain("near_test_week");
  });

  it("builds every preset", () => {
    for (const preset of presets(THIS_WEEK, MONTHS)) expect(firstWeek(preset.inputs, null), preset.label).not.toBeNull();
  });

  it("plans each sample direction from its own sample", () => {
    expect(firstWeek(presetInputs("slipping", THIS_WEEK, MONTHS), null)?.plannedFrom).toBe("Slipping sample");
  });

  it("Test in 3 weeks builds a near-test week with the second practice test and its reason", () => {
    const soon = presetInputs("soon", THIS_WEEK, MONTHS);
    expect(soon).toMatchObject({ weekOf: "2026-12-21", testMonth: "2027-01-01" });
    const schedule = firstWeek(soon, null)!.schedule;
    expect(DAY_ORDER.filter((day) => schedule.days[day].type === "practice_test")).toHaveLength(2);
    expect(weekReasons(schedule).find((r) => r.code === "near_test_week")?.sentence).toMatch(/2 LawHub practice tests before your January 1 test/);
  });

  it("Test in 3 weeks moves to the next test month once the near week has passed", () => {
    expect(presetInputs("soon", "2026-12-28", MONTHS)).toMatchObject({ weekOf: "2027-01-25", testMonth: "2027-02-01" });
  });

  it("falls back to Steady for an unknown preset", () => {
    expect(presetInputs("nope", THIS_WEEK, MONTHS)).toEqual(steady);
  });
});

describe("field errors", () => {
  it("an out-of-range goal gets the live field error and builds no week", () => {
    const typo: LabInputs = { ...steady, goal: "20" };
    const errors = fieldErrors(typo, MONTHS);
    expect(errors.goal).toBe("LSAT scores go from 120 to 180. Check your goal score.");
    expect(firstWeek(typo, null)).toBeNull();
    expect(staleReason(errors)).toBe("Fix the goal score.");
  });

  it("names every field that needs a fix", () => {
    const errors = fieldErrors({ ...steady, current: "", goal: "", testMonth: "2026-11-01" }, MONTHS);
    expect(hasErrors(errors)).toBe(true);
    expect(staleReason(errors)).toBe("Fix the current PT score, goal score, goal test month.");
  });

  it("refuses a practice-test day too short for the test", () => {
    const errors = fieldErrors({ ...steady, days: { ...steady.days, SATURDAY: 30 } }, MONTHS);
    expect(errors.days.SATURDAY).toBeTruthy();
    expect(staleReason(errors)).toBe("Fix the study time.");
  });

  it("has none for a preset", () => {
    expect(hasErrors(fieldErrors(steady, MONTHS))).toBe(false);
  });
});

describe("copy a student", () => {
  it("copies their inputs and plans from their upload", () => {
    const inputs = copiedInputs(mockStudent, maya, THIS_WEEK, MONTHS);
    expect(inputs).toMatchObject({
      preset: "student", copiedFrom: "s1", weekOf: THIS_WEEK, current: "160", goal: "170", testMonth: "2027-01-01",
      days: mockStudent.dailyCapacityMinutes, ptDay: "SATURDAY", analytics: { kind: "student" },
    });
    const week = firstWeek(inputs, maya)!;
    expect(week.plannedFrom).toBe("Maya Thompson's latest upload");
    expect(week.schedule.weekOf).toBe(THIS_WEEK);
  });

  it("starts from Steady for a student without analytics", () => {
    expect(copiedInputs(mockStudent, { ...maya, trend: null }, THIS_WEEK, MONTHS)).toEqual({ ...steady, copiedFrom: "s1" });
  });
});

describe("week chain", () => {
  const weekOfs = (chain: LabChain | null) => chain?.weeks.map((w) => w.schedule.weekOf);

  it("builds each following week from the one before, with one more sample upload a week", () => {
    const chain = buildLabChain({ ...steady, built: 3 }, MONTHS, null)!;
    expect(weekOfs(chain)).toEqual(["2026-11-16", "2026-11-23", "2026-11-30"]);
    expect(chain.weeks.map((w) => w.plannedFrom)).toEqual(["Steady sample", "Steady sample, week 2 upload", "Steady sample, week 3 upload"]);
    expect(chain.weeks[0]).toEqual(firstWeek(steady, null));
    expect(chain.end).toBeNull();
  });

  it("treats the earlier lab weeks as the prior schedules", () => {
    const copied = copiedInputs(mockStudent, maya, THIS_WEEK, MONTHS);
    const second = buildLabChain({ ...copied, built: 2 }, MONTHS, maya)!.weeks[1]!;
    const alone = firstWeek({ ...copied, weekOf: "2026-11-23" }, maya)!;
    expect(second.plannedFrom).toBe("Maya Thompson's latest upload, as in week 1");
    expect(second.schedule.weekOf).toBe(alone.schedule.weekOf);
    expect(second.schedule).not.toEqual(alone.schedule);
  });

  it("gives Monday to the review of a Sunday practice test the week before", () => {
    const sunday: LabInputs = { ...steady, days: { ...steady.days, SATURDAY: 120, SUNDAY: 210 }, ptDay: "SUNDAY", built: 2 };
    const [one, two] = buildLabChain(sunday, MONTHS, null)!.weeks;
    expect(one!.schedule.days.SUNDAY.type).toBe("practice_test");
    expect(one!.schedule.days.MONDAY.type).not.toBe("review");
    expect(two!.schedule.days.MONDAY).toMatchObject({ type: "review", activities: [{ label: "PT Review + Blind Review" }] });
  });

  it("stops at 12 weeks and says why", () => {
    const far: LabInputs = { ...steady, testMonth: "2027-06-01", built: 12 };
    const chain = buildLabChain(far, MONTHS, null)!;
    expect(chain.weeks).toHaveLength(12);
    expect(chain.end).toEqual({ kind: "limit" });
    expect(chainEndText(chain.end, far.testMonth)).toBe("The lab builds up to 12 weeks.");
    expect(buildLabChain({ ...far, built: 11 }, MONTHS, null)!.end).toBeNull();
  });

  it("stops before the week that starts on or after the goal test month and says why", () => {
    const chain = buildLabChain({ ...steady, built: 12 }, MONTHS, null)!;
    expect(chain.weeks).toHaveLength(11);
    expect(chain.weeks.at(-1)!.schedule.weekOf).toBe("2027-01-25");
    expect(chain.end).toEqual({ kind: "test", nextWeekOf: "2027-02-01" });
    expect(chainEndText(chain.end, steady.testMonth)).toBe("The February 2027 test comes before the week of Feb 1.");
    expect(buildLabChain({ ...steady, built: 11 }, MONTHS, null)!.end).toEqual(chain.end);
    expect(buildLabChain({ ...steady, built: 10 }, MONTHS, null)!.end).toBeNull();
  });

  it("moves back without dropping later weeks, and grows when Next week passes the built count", () => {
    const back = showWeek({ ...steady, built: 3, shown: 2 }, 0);
    expect(back).toMatchObject({ built: 3, shown: 0 });
    expect(showWeek(back, 3)).toMatchObject({ built: 4, shown: 3 });
  });
});

describe("page link", () => {
  it("reopens the same inputs", () => {
    const edited: LabInputs = { ...presetInputs("double", THIS_WEEK, MONTHS), goal: "17", copiedFrom: "s1", analytics: { kind: "student" } };
    expect(readLabLink(encodeLabLink(edited), THIS_WEEK)).toEqual(edited);
  });

  it("keeps the built count and the shown week", () => {
    expect(readLabLink(encodeLabLink({ ...steady, built: 5, shown: 2 }), THIS_WEEK)).toMatchObject({ built: 5, shown: 2 });
  });

  it("opens week 1 for a link without a chain, and keeps the shown week inside the built ones", () => {
    const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, "");
    expect(readLabLink(encode({ ...steady, built: undefined, shown: undefined }), THIS_WEEK)).toEqual(steady);
    expect(readLabLink(encode({ ...steady, built: 3, shown: 7 }), THIS_WEEK)).toMatchObject({ built: 3, shown: 2 });
    expect(readLabLink(encode({ ...steady, built: 40, shown: 1 }), THIS_WEEK)).toMatchObject({ built: 1, shown: 0 });
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

describe("screenshots", () => {
  const read: LabRead = {
    lr: [
      { type: "Strengthen", category: "regular", accuracy: 68 },
      { type: "Necessary assumption", category: "regular", accuracy: 74 },
      { type: "Causal reasoning", category: "restricted", isTopPriority: true, priorityTier: "highest" },
    ],
    rc: [{ type: "Law", category: "passage", accuracy: 58 }, { type: "Art", category: "passage", accuracy: 77 }],
    practiceTest: null,
  };
  const withPracticeTest: LabRead = {
    ...read,
    practiceTest: { prepTest: 158, sections: [], hiddenResults: [], missedStemTypes: [], missedQuestions: 4, missedStemTypeCounts: { Weaken: 4 } },
  };
  const screenshots: LabInputs = { ...steady, analytics: { kind: "screenshots" } };
  const missedFirst = (week: LabChain["weeks"][number]) => week.schedule.reasons?.some((r) => r.code === "missed_type_priority") ?? false;

  it("builds nothing until both LR and RC are read, and says what to add", () => {
    const errors = fieldErrors(screenshots, MONTHS);
    expect(buildLabChain(screenshots, MONTHS, null)).toBeNull();
    expect(staleReason(errors)).toBe("Add the Logical Reasoning and Reading Comprehension screenshots.");
    expect(staleReason({ ...errors, goal: "x" })).toBe("Fix the goal score. Add the Logical Reasoning and Reading Comprehension screenshots.");
  });

  it("plans every week from what the screenshots read", () => {
    const chain = buildLabChain({ ...screenshots, built: 2 }, MONTHS, null, read)!;
    expect(chain.weeks.map((w) => w.plannedFrom)).toEqual(["Screenshots: 2 LR types · 2 RC types", "Screenshots: 2 LR types · 2 RC types, as in week 1"]);
  });

  it("applies practice test missed types to week 1 only", () => {
    const chain = buildLabChain({ ...screenshots, built: 2 }, MONTHS, null, withPracticeTest)!;
    expect(chain.weeks[0]!.plannedFrom).toBe("Screenshots: 2 LR types · 2 RC types · PT 158, 4 missed");
    expect(chain.weeks.map(missedFirst)).toEqual([true, false]);
    expect(buildLabChain(screenshots, MONTHS, null, read)!.weeks.map(missedFirst)).toEqual([false]);
  });

  it("keeps Screenshots in the page link, never what was read", () => {
    expect(readLabLink(encodeLabLink(screenshots), THIS_WEEK)?.analytics).toEqual({ kind: "screenshots" });
  });
});
