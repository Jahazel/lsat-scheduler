import { describe, expect, it } from "vitest";
import { formatDuration, roundMinutesToTotal } from "./formatDuration";

describe("formatDuration", () => {
  it("formats minutes, hours, and both", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(95)).toBe("1 h 35 min");
  });
});

describe("roundMinutesToTotal", () => {
  it("rounds each part to whole minutes", () => {
    expect(roundMinutesToTotal([34.6, 60.4])).toEqual([35, 60]);
  });

  it("keeps the parts summing to the rounded total when halves would overshoot", () => {
    const parts = roundMinutesToTotal([34.5, 60.5]);
    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(95);
  });

  it("keeps the parts summing to the rounded total across many fractional parts", () => {
    const parts = roundMinutesToTotal([10.3, 10.3, 10.3, 10.3]);
    expect(parts).toEqual([11, 10, 10, 10]);
  });

  it("leaves whole minutes unchanged", () => {
    expect(roundMinutesToTotal([150])).toEqual([150]);
    expect(roundMinutesToTotal([])).toEqual([]);
  });
});
