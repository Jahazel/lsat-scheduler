import { describe, expect, it } from "vitest";
import { studentFacts, type StudentFactsInput } from "./studentFacts";

const now = new Date("2026-11-17T18:00:00Z");
const maya: StudentFactsInput = {
  currentScore: 158, goalScore: 170, goalTestDate: "2027-01-01", weeklyMinutes: 930,
  joinedAt: new Date("2026-09-02T17:00:00Z"), pastWeeks: 10, needsAnalytics: false,
};
const values = (input: Partial<StudentFactsInput>) => Object.fromEntries(studentFacts({ ...maya, ...input }, now).map((fact) => [fact.label, fact.value]));

describe("Student facts", () => {
  it("reads the score, test month and days left, study time per week, joined day, and past weeks", () => {
    expect(studentFacts(maya, now)).toEqual([
      { label: "Score", value: "158 → 170" },
      { label: "Test", value: "Jan 2027 · 45 days" },
      { label: "Study time", value: "15 h 30 min per week" },
      { label: "Joined", value: "Sep 2" },
      { label: "Past weeks", value: "10" },
    ]);
  });

  it("mutes the score with no analytics and the past weeks before the first week ends", () => {
    const facts = studentFacts({ ...maya, needsAnalytics: true, pastWeeks: 0 }, now);
    expect(facts.find((fact) => fact.label === "Score")).toEqual({ label: "Score", value: "No analytics · goal 170", muted: true });
    expect(facts.find((fact) => fact.label === "Past weeks")).toEqual({ label: "Past weeks", value: "None yet", muted: true });
  });

  it("names a test that is one day away, today, or passed", () => {
    expect(values({ goalTestDate: "2026-11-18" }).Test).toBe("Nov 2026 · 1 day");
    expect(values({ goalTestDate: "2026-11-17" }).Test).toBe("Nov 2026 · Test day");
    expect(values({ goalTestDate: "2026-11-01" }).Test).toBe("Nov 2026 · Passed");
  });
});
