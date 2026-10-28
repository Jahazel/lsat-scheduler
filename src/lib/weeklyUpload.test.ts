import { describe, expect, it } from "vitest";
import { generateWeek } from "./engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "./mockData";
import type { ApprovedAnalyticsSnapshot, PersistedWeeklySchedule, Student } from "./types";
import { PT158_FIXTURES } from "./practiceTestFixtures/pt158";
import { openWeeklyUpload, prepareWeeklyUpload } from "./weeklyUpload";

const TIMEZONE = "America/Chicago";
const saturday = new Date("2026-10-03T15:00:00.000Z");
const wednesday = new Date("2026-10-07T15:00:00.000Z");

function savedWeek(weekStartDate: string, student: Student = mockStudent): PersistedWeeklySchedule {
  return {
    id: `student:${weekStartDate}`,
    studentId: "student",
    weekStartDate,
    generatedAt: `${weekStartDate}T12:00:00.000Z`,
    schedule: generateWeek(student, { ...mockAnalytics, weekOf: weekStartDate }, mockRules, mockStudentName),
    sourceSnapshotIds: [],
    generationInputs: { student, timezone: TIMEZONE, remainingDays: [], analytics: mockAnalytics },
    policyVersion: "adaptive-weekly-schedule-v3",
  };
}

const openAt = (now: Date, schedules: PersistedWeeklySchedule[], snapshots: ApprovedAnalyticsSnapshot[] = []) =>
  openWeeklyUpload({ clock: { now, real: now, simulated: false }, student: mockStudent, schedules, snapshots });

function basisAt(now: Date, schedules: PersistedWeeklySchedule[], snapshots: ApprovedAnalyticsSnapshot[] = []) {
  const basis = openAt(now, schedules, snapshots);
  if (!basis) throw new Error("Expected the weekly upload to be open");
  return basis;
}

describe("openWeeklyUpload", () => {
  it("plans the Monday after the student's current week from Saturday, starting Monday", () => {
    expect(basisAt(saturday, [])).toMatchObject({ weekOf: "2026-10-05", startsOn: "MONDAY" });
    const lateSundayInChicago = new Date("2026-10-05T04:30:00.000Z");
    expect(basisAt(lateSundayInChicago, []).weekOf).toBe("2026-10-05");
  });

  it("knows whether this week's schedule had a practice test", () => {
    expect(basisAt(saturday, [savedWeek("2026-09-28")]).hadPracticeTest).toBe(true);
    const noTest = savedWeek("2026-09-28");
    noTest.schedule.days.SATURDAY = { day: "SATURDAY", type: "unscheduled", activities: [], totalMinutes: 0 };
    expect(basisAt(saturday, [noTest]).hadPracticeTest).toBe(false);
  });

  it("treats a week with no saved schedule as a week with no practice test", () => {
    expect(basisAt(saturday, [savedWeek("2026-09-21")]).hadPracticeTest).toBe(false);
  });

  it("keeps the 2 newest approved snapshots, breaking a tie by id", () => {
    const snapshot = (id: string, approvedAt: string) => ({ ...mockAnalytics, id, approvedAt });
    const snapshots = [
      snapshot("old", "2026-09-20T12:00:00.000Z"),
      snapshot("tie-b", "2026-09-27T12:00:00.000Z"),
      snapshot("tie-a", "2026-09-27T12:00:00.000Z"),
    ];
    expect(basisAt(saturday, [], snapshots).priorSnapshots.map(({ id }) => id)).toEqual(["tie-a", "tie-b"]);
  });

  it("carries a Sunday practice test into next week's review day", () => {
    const sunday = savedWeek("2026-09-28", { ...mockStudent, preferredPracticeTestDay: "SUNDAY" });
    expect(basisAt(saturday, [sunday]).priorWeekPracticeTestReviewMinutes).toBeGreaterThan(0);
    expect(basisAt(saturday, [savedWeek("2026-09-28")]).priorWeekPracticeTestReviewMinutes).toBeUndefined();
  });

  it("plans the rest of the current week from Monday to Friday, starting today", () => {
    expect(basisAt(wednesday, [])).toMatchObject({ weekOf: "2026-10-05", startsOn: "WEDNESDAY" });
    const mondayInChicago = new Date("2026-10-05T05:30:00.000Z");
    expect(basisAt(mondayInChicago, [])).toMatchObject({ weekOf: "2026-10-05", startsOn: "MONDAY" });
  });

  it("on a weekday, asks for last week's practice test and carries last week's Sunday test", () => {
    expect(basisAt(wednesday, [savedWeek("2026-09-28")]).hadPracticeTest).toBe(true);
    expect(basisAt(wednesday, [savedWeek("2026-09-21")]).hadPracticeTest).toBe(false);
    const sunday = savedWeek("2026-09-28", { ...mockStudent, preferredPracticeTestDay: "SUNDAY" });
    expect(basisAt(wednesday, [sunday]).priorWeekPracticeTestReviewMinutes).toBeGreaterThan(0);
  });

  it("is closed on a weekday once this week has a weekly schedule, and open on the weekend", () => {
    expect(openAt(wednesday, [savedWeek("2026-10-05")])).toBeNull();
    expect(openAt(saturday, [savedWeek("2026-09-28")])).not.toBeNull();
  });

  it("is closed on a weekday once an upload counts for this week, but not on the weekend", () => {
    const counted = [{ ...mockAnalytics, id: "sunday", approvedAt: "2026-10-04T20:00:00.000Z" }];
    expect(openAt(wednesday, [], counted)).toBeNull();
    expect(openAt(saturday, [], [{ ...counted[0], approvedAt: "2026-10-03T14:00:00.000Z" }])).not.toBeNull();
  });
});

const now = new Date("2026-10-17T17:05:00.000Z");
const extractedAt = "2026-10-17T17:00:00.000Z";
const confirmedAt = "2026-10-17T17:04:00.000Z";

const analytics = {
  rows: [
    { type: "Necessary assumption", category: "regular", accuracy: 76 },
    { type: "Phenomenon-hypothesis (LR)", category: "restricted", isTopPriority: true },
    { type: "Law", category: "passage", accuracy: 58 },
  ],
  extraction: { source: "7sage_screenshot", extractedAt },
  confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt },
};

const practiceTest = () => ({
  readings: PT158_FIXTURES.map(({ reading }) => structuredClone(reading)),
  picks: [],
  extraction: { source: "7sage_screenshot", extractedAt },
  confirmation: { extractedValuesMatch: true, isThisWeeksPracticeTest: true, confirmedAt },
});

const tuesday = new Date("2026-10-13T17:05:00.000Z");

type Context = Parameters<typeof prepareWeeklyUpload>[1];
const prepare = (input: object, overrides: Partial<Context> = {}) =>
  prepareWeeklyUpload({ weekOf: "2026-10-19", currentScore: 156, analytics, practiceTest: practiceTest(), ...input }, {
    clock: { now, real: now, simulated: false },
    schedules: [savedWeek("2026-10-12")],
    allowAdminSample: false,
    scanningOff: { analytics: false, "practice-test-section": false },
    ...overrides,
  });

describe("prepareWeeklyUpload", () => {
  it("prepares the snapshot, the practice-test result, and the score together", () => {
    const prepared = prepare({});

    expect(prepared.currentScore).toBe(156);
    expect(prepared.snapshot.lrAccuracyByType).toEqual({ "Necessary assumption": 0.76 });
    expect(prepared.practiceTest).toMatchObject({
      prepTest: 158,
      weekOf: prepared.snapshot.weekOf,
      approvedAt: now,
      missedStemTypeCounts: { "Flaw or descriptive weakening": 2 },
      hiddenResults: [{ section: 3, question: 18, result: "correct", settledBy: "score" }],
    });
  });

  it("accepts typed analytics with a scanned practice test, each keeping its own source", () => {
    const typedAt = "2026-10-10T09:00:00.000Z";
    const prepared = prepare({ analytics: { ...analytics, extraction: { source: "manual_entry", extractedAt: typedAt } } });

    expect(prepared.snapshot.extraction).toEqual({ source: "manual_entry", extractedAt: new Date(typedAt) });
    expect(prepared.snapshot.lrTopPriorityLogicTypes).toEqual(["Phenomenon-hypothesis (LR)"]);
    expect(prepared.practiceTest?.extractionSource).toBe("7sage_screenshot");
  });

  it("refuses missed counts sent by the browser, since it works them out from the section readings", () => {
    expect(() => prepare({ practiceTest: { ...practiceTest(), missedStemTypeCounts: { Weaken: 9 } } }))
      .toThrow("Confirm that the practice-test values match your screenshots.");
  });

  it.each([
    ["a score above 180", { currentScore: 181 }, "Enter a score from 120 to 180."],
    ["a score below 120", { currentScore: 119 }, "Enter a score from 120 to 180."],
    ["a score that is not whole", { currentScore: 155.5 }, "Enter a score from 120 to 180."],
    ["a score sent as text", { currentScore: "156" }, "Enter a score from 120 to 180."],
    ["no practice test in a practice-test week", { practiceTest: null }, "Add this week's practice test before you confirm."],
    ["an unticked practice-test statement",
      { practiceTest: { ...practiceTest(), confirmation: { extractedValuesMatch: true, isThisWeeksPracticeTest: false, confirmedAt } } },
      "Confirm that the practice-test values match your screenshots."],
    ["only three sections", { practiceTest: { ...practiceTest(), readings: practiceTest().readings.slice(0, 3) } },
      "Confirm that the practice-test values match your screenshots."],
    ["a missed count that does not match its section score",
      { practiceTest: { ...practiceTest(), readings: practiceTest().readings.map((reading) => ({ ...reading, score: -1 })) } },
      "Fix your practice-test screenshots before you confirm."],
    ["a sample practice test from a student", { practiceTest: { ...practiceTest(), extraction: { source: "admin_sample", extractedAt } } },
      "Admin access required for sample analytics."],
    ["a stale practice-test reading",
      { practiceTest: { ...practiceTest(), extraction: { source: "7sage_screenshot", extractedAt: "2026-10-15T17:00:00.000Z" } } },
      "Upload fresh practice-test screenshots before saving."],
  ])("refuses %s", (_case, input, message) => {
    expect(() => prepare(input)).toThrow(message);
  });

  it("refuses a practice test in a week whose plan had none, and accepts analytics alone", () => {
    expect(() => prepare({}, { schedules: [] })).toThrow("This week's plan had no practice test.");
    expect(prepare({ practiceTest: null }, { schedules: [] }).practiceTest).toBeNull();
  });

  it("accepts no practice test in a practice-test week only while practice-test scans are off", () => {
    const scansOff = { scanningOff: { analytics: true, "practice-test-section": true } };
    expect(() => prepare({ practiceTest: null })).toThrow("Add this week's practice test before you confirm.");
    expect(prepare({ practiceTest: null }, scansOff).practiceTest).toBeNull();
    expect(prepare({}, scansOff).practiceTest).toMatchObject({ prepTest: 158 });
  });

  it.each([
    ["a page built for another week", { weekOf: "2026-10-12" }, {}],
    ["a page with no week", { weekOf: undefined }, {}],
    ["a weekday page once this week has a weekly schedule", { weekOf: "2026-10-12" },
      { clock: { now: tuesday, real: tuesday, simulated: false }, schedules: [savedWeek("2026-10-12")] }],
  ])("refuses %s as out of date, before it reads any values", (_case, input, overrides) => {
    expect(() => prepare({ ...input, currentScore: 0 }, overrides)).toThrow("This page is out of date. Open This week to continue.");
  });

  it("still confirms an open weekday page after an upload already counts for the week", () => {
    const monday = new Date("2026-10-19T17:05:00.000Z");
    const counted = [{ ...mockAnalytics, id: "saturday", approvedAt: now.toISOString() }];
    expect(openWeeklyUpload({ clock: { now: monday, real: monday, simulated: false }, student: mockStudent, schedules: [], snapshots: counted }))
      .toBeNull();
    expect(prepare({ weekOf: "2026-10-19", practiceTest: null }, { clock: { now: monday, real: now, simulated: false }, schedules: [] }).snapshot)
      .toMatchObject({ approvedAt: monday });
  });

  it("dates an admin's simulated week by the simulated date and checks freshness on the real clock", () => {
    const simulated = new Date("2026-11-07T17:05:00.000Z");
    const prepared = prepare({ weekOf: "2026-11-09" }, {
      clock: { now: simulated, real: now, simulated: true },
      schedules: [savedWeek("2026-11-02")],
    });

    expect(prepared.snapshot).toMatchObject({ weekOf: "2026-11-07", approvedAt: simulated });
    expect(prepared.practiceTest).toMatchObject({ weekOf: "2026-11-07", approvedAt: simulated });
  });

  it("accepts an admin's sample practice test", () => {
    const sample = { ...practiceTest(), extraction: { source: "admin_sample", extractedAt } };
    const prepared = prepare({ practiceTest: sample, analytics: { ...analytics, extraction: { source: "admin_sample", extractedAt } } },
      { allowAdminSample: true });

    expect(prepared.practiceTest?.extractionSource).toBe("admin_sample");
    expect(prepared.snapshot.extraction.source).toBe("admin_sample");
  });
});
