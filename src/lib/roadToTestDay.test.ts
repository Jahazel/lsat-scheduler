import { describe, expect, it } from "vitest";
import { roadToTestDay } from "./roadToTestDay";

const student = { currentScore: 150, goalScore: 165, goalTestDate: "2027-01-08" };
const at = (date: string) => roadToTestDay(student, new Date(`${date}T17:00:00.000Z`), "America/Chicago");

describe("roadToTestDay", () => {
  it("names the test month and the scores", () => {
    expect(at("2026-11-12")).toMatchObject({ current: 150, goal: 165, month: "January", year: "2027" });
  });

  it("counts whole weeks, rounded, from 7 days out", () => {
    expect(at("2026-11-08").left).toEqual({ kind: "weeks", count: 9 });
    expect(at("2027-01-01").left).toEqual({ kind: "weeks", count: 1 });
  });

  it("counts days under a week out, then Test day, then passed", () => {
    expect(at("2027-01-02").left).toEqual({ kind: "days", count: 6 });
    expect(at("2027-01-07").left).toEqual({ kind: "days", count: 1 });
    expect(at("2027-01-08").left).toEqual({ kind: "test_day" });
    expect(at("2027-01-09").left).toEqual({ kind: "passed" });
  });
});
