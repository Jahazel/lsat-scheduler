import { describe, expect, it } from "vitest";
import { mockAnalytics, mockRules } from "./mockData";
import { generateSampleAnalytics } from "./sampleAnalytics";
import type { LRLogicType, LRType } from "./types";

const regularTypes = [...mockRules.lrStemTypes, ...mockRules.lrLogicExceptions] as LRType[];
const restrictedTypes = mockRules.lrLogicTypes.filter((type) =>
  !mockRules.lrLogicExceptions.includes(type)) as LRLogicType[];

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function create(seed: number, overrides: Partial<Parameters<typeof generateSampleAnalytics>[0]> = {}) {
  return generateSampleAnalytics({
    previous: null,
    direction: "steady",
    currentScore: 160,
    earlierSampleCount: 0,
    regularTypes,
    restrictedTypes,
    random: seeded(seed),
    ...overrides,
  });
}

describe("generateSampleAnalytics", () => {
  it("starts with every regular type at the profile value adjusted by score", () => {
    const ordinary = create(1);
    const low = create(1, { currentScore: 149 });
    const high = create(1, { currentScore: 165 });
    expect(Object.keys(ordinary.lrAccuracyByType)).toHaveLength(27);
    const expected: Partial<Record<LRType, number>> = {
      "Argument part": 0.62,
      Evaluate: 0.55,
      "Except (LR)": 0.72,
      "Fill in the blank": 0.8,
      "Flaw or descriptive weakening": 0.71,
      Inference: 0.65,
      "Main conclusion or main point": 0.88,
      "Method of reasoning or descriptive": 0.6,
      "Miscellaneous (LR)": 0.5,
      "Most strongly supported": 0.68,
      "Must be false": 0.52,
      "Must be true": 0.75,
      "Necessary assumption": 0.58,
      "PSA - find or complete the application": 0.66,
      "PSA - find the rule": 0.63,
      "Parallel flawed method of reasoning": 0.4,
      "Parallel method of reasoning": 0.45,
      "Point at issue: agree": 0.77,
      "Point at issue: disagree": 0.73,
      Principle: 0.7,
      "Resolve reconcile or explain": 0.66,
      Strengthen: 0.64,
      "Sufficient assumption": 0.5,
      Weaken: 0.61,
      Diagram: 0.35,
      Math: 0.3,
      "Conditional reasoning": 0.58,
    };
    expect(ordinary.lrAccuracyByType).toEqual(expected);
    for (const type of regularTypes) {
      expect(low.lrAccuracyByType[type]).toBeCloseTo(expected[type]! - 0.1);
      expect(high.lrAccuracyByType[type]).toBeCloseTo(Math.min(0.95, expected[type]! + 0.1));
    }
    expect(ordinary.lrTopPriorityLogicTypes.length).toBe(1);
  });

  it("starts later samples from prior values and fills missing types from the score profile", () => {
    const partial = { ...mockAnalytics, lrAccuracyByType: { "Argument part": 0.42 } };
    const result = create(2, { previous: partial, direction: "steady", currentScore: 170 });
    expect(result.lrAccuracyByType["Argument part"]).toBe(0.42);
    expect(result.lrAccuracyByType.Evaluate).toBe(0.65);
    expect(result.lrTopPriorityLogicTypes).toEqual(partial.lrTopPriorityLogicTypes);
  });

  it.each([ ["improving", 1], ["slipping", -1] ] as const)("moves about one-third of types in the %s direction", (direction, sign) => {
    const previous = { ...mockAnalytics, lrAccuracyByType: Object.fromEntries(regularTypes.map((type) => [type, 0.6])) };
    const result = create(33, { previous, direction });
    const changed = regularTypes.filter((type) => result.lrAccuracyByType[type] !== 0.6);
    expect(changed.length).toBeGreaterThanOrEqual(9);
    const mainMoves = changed.filter((type) => Math.sign(Math.round(result.lrAccuracyByType[type]! * 100) - 60) === sign && Math.abs(Math.round(result.lrAccuracyByType[type]! * 100) - 60) >= 2);
    expect(mainMoves).toHaveLength(9);
    expect(changed.length).toBeGreaterThanOrEqual(10);
    expect(changed.length).toBeLessThanOrEqual(11);
    expect(regularTypes.reduce((sum, type) => sum + Math.round(result.lrAccuracyByType[type]! * 100) - 60, 0) * sign).toBeGreaterThan(0);
  });

  it("keeps steady movement balanced", () => {
    const previous = { ...mockAnalytics, lrAccuracyByType: Object.fromEntries(regularTypes.map((type) => [type, 0.6])) };
    const result = create(11, { previous, direction: "steady" });
    const changes = regularTypes.filter((type) => result.lrAccuracyByType[type] !== 0.6);
    expect(changes.length).toBeGreaterThanOrEqual(3);
    expect(changes.length).toBeLessThanOrEqual(5);
    expect(Math.abs(changes.reduce((sum, type) => sum + Math.round(result.lrAccuracyByType[type]! * 100) - 60, 0) / regularTypes.length)).toBeLessThanOrEqual(0.5);
  });

  it("retains restricted flags and replaces one every third generated sample", () => {
    const initial = create(42);
    expect(initial.lrTopPriorityLogicTypes.every((type) => restrictedTypes.includes(type))).toBe(true);
    const previous = { ...mockAnalytics, lrTopPriorityLogicTypes: [initial.lrTopPriorityLogicTypes[0]] };
    const second = create(5, { previous, earlierSampleCount: 1 });
    const third = create(5, { previous: { ...previous, lrTopPriorityLogicTypes: second.lrTopPriorityLogicTypes }, earlierSampleCount: 2 });
    expect(second.lrTopPriorityLogicTypes).toEqual(previous.lrTopPriorityLogicTypes);
    expect(third.lrTopPriorityLogicTypes).toHaveLength(1);
    expect(third.lrTopPriorityLogicTypes[0]).not.toBe(previous.lrTopPriorityLogicTypes[0]);
    expect(Object.keys(third.lrAccuracyByType)).not.toContain(third.lrTopPriorityLogicTypes[0]);
  });

  it("recovers initial flags when the previous snapshot has none and clamps whole percentages", () => {
    const previous = { ...mockAnalytics, lrAccuracyByType: Object.fromEntries(regularTypes.map((type) => [type, 0.94])), lrTopPriorityLogicTypes: [] };
    const result = create(13, { previous, direction: "improving" });
    expect([1, 2]).toContain(result.lrTopPriorityLogicTypes.length);
    expect(Object.values(result.lrAccuracyByType).every((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9 && value >= 0.1 && value <= 0.95)).toBe(true);
  });
  it("rounds and clamps previous values even when the type does not move", () => {
    for (const [prior, expected] of [[1.2, 0.95], [-0.2, 0.1], [0.055, 0.1], [0.426, 0.43]]) {
      const previous = { ...mockAnalytics, lrAccuracyByType: Object.fromEntries(regularTypes.map((type) => [type, prior])) };
      const result = create(2, { previous, direction: "steady" });
      expect(Object.values(result.lrAccuracyByType).filter((value) => value === expected).length).toBeGreaterThanOrEqual(22);
      for (const value of Object.values(result.lrAccuracyByType)) {
        expect(value).toBeGreaterThanOrEqual(0.1);
        expect(value).toBeLessThanOrEqual(0.95);
        expect(value * 100).toBeCloseTo(Math.round(value * 100));
      }
    }
  });

  it.each([["improving", 0.95, 1], ["slipping", 0.1, -1]] as const)(
    "never reverses an intended %s step at the bound",
    (direction, bound, sign) => {
      for (const seed of [1, 33, 91]) {
        for (const room of [0, 1, 2]) {
          const accuracy: Partial<Record<LRType, number>> = Object.fromEntries(regularTypes.map((type) => [type, bound]));
          accuracy[regularTypes[0]] = (Math.round(bound * 100) - sign * room) / 100;
          const result = create(seed, { previous: { ...mockAnalytics, lrAccuracyByType: accuracy }, direction });
          const deltas = regularTypes.map((type) =>
            Math.round(result.lrAccuracyByType[type]! * 100) - Math.round(accuracy[type]! * 100));
          const net = deltas.reduce((sum, delta) => sum + delta, 0) * sign;
          if (room < 2) expect(deltas.every((delta) => delta === 0)).toBe(true);
          else {
            expect(deltas[0] * sign).toBe(2);
            expect(net).toBeGreaterThan(0);
          }
        }
      }
    },
  );

  it("chooses steady movers with room at both bounds", () => {
    for (const seed of [1, 11, 33, 91]) {
      for (const split of [0, 1, 13, 26, 27]) {
        const accuracy = Object.fromEntries(regularTypes.map((type, index) => [type, index < split ? 0.1 : 0.95]));
        const result = create(seed, { previous: { ...mockAnalytics, lrAccuracyByType: accuracy } });
        const deltas = regularTypes.map((type) => Math.round(result.lrAccuracyByType[type]! * 100) - Math.round(accuracy[type] * 100));
        const moved = deltas.filter((delta) => delta !== 0);
        expect(moved.length).toBeGreaterThanOrEqual(3);
        expect(moved.length).toBeLessThanOrEqual(5);
        expect(moved.every((delta) => Math.abs(delta) <= 2)).toBe(true);
        expect(Math.abs(moved.reduce((sum, delta) => sum + delta, 0)) / 27).toBeLessThanOrEqual(0.5);
        if (split === 13) expect(Math.abs(moved.filter((d) => d > 0).length - moved.filter((d) => d < 0).length)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("allows either direction to get the extra steady move", () => {
    const majorities = new Set<number>();
    for (const seed of [1, 11, 33, 91, 400, 1000, 2000]) {
      const previous = { ...mockAnalytics, lrAccuracyByType: Object.fromEntries(regularTypes.map((type) => [type, 0.6])) };
      const result = create(seed, { previous });
      const deltas = Object.values(result.lrAccuracyByType).map((value) => Math.round(value * 100) - 60).filter((delta) => delta !== 0);
      const balance = deltas.filter((delta) => delta > 0).length - deltas.filter((delta) => delta < 0).length;
      expect(Math.abs(balance)).toBeLessThanOrEqual(1);
      if (balance !== 0) majorities.add(balance);
    }
    expect([...majorities].sort()).toEqual([-1, 1]);
  });

  it.each([149, 150, 164, 165])("uses the score boundary at %i and ignores first-sample direction", (currentScore) => {
    const expected = currentScore === 149 ? [0.52, 0.78, 0.2]
      : currentScore === 165 ? [0.72, 0.95, 0.4] : [0.62, 0.88, 0.3];
    for (const direction of ["improving", "steady", "slipping"] as const) {
      const result = create(42, { currentScore, direction });
      expect([result.lrAccuracyByType["Argument part"], result.lrAccuracyByType["Main conclusion or main point"], result.lrAccuracyByType.Math]).toEqual(expected);
      expect(result).toEqual(create(42, { currentScore }));
    }
  });

  it.each([["improving", 1], ["slipping", -1]] as const)("caps %s moves at five points and opposite moves at two", (direction, sign) => {
    const observedMain = new Set<number>();
    const observedOpposite = new Set<number>();
    for (const seed of [1, 11, 33, 91, 400, 1000, 2000]) {
      const previous = { ...mockAnalytics, lrAccuracyByType: Object.fromEntries(regularTypes.map((type) => [type, 0.6])) };
      const result = create(seed, { previous, direction });
      const deltas = Object.values(result.lrAccuracyByType).map((value) => (Math.round(value * 100) - 60) * sign);
      const main = deltas.filter((delta) => delta > 0);
      const opposite = deltas.filter((delta) => delta < 0);
      expect(main).toHaveLength(9);
      expect([1, 2]).toContain(opposite.length);
      for (const delta of main) {
        expect([2, 3, 4, 5]).toContain(delta);
        observedMain.add(delta);
      }
      for (const delta of opposite) {
        expect([-1, -2]).toContain(delta);
        observedOpposite.add(delta);
      }
    }
    expect([...observedMain].sort()).toEqual([2, 3, 4, 5]);
    expect([...observedOpposite].sort()).toEqual([-1, -2]);
  });

  it("occasionally chooses two distinct first flags", () => {
    expect(create(1).lrTopPriorityLogicTypes).toHaveLength(1);
    const two = create(2000).lrTopPriorityLogicTypes;
    expect(two).toHaveLength(2);
    expect(new Set(two).size).toBe(2);
    expect(two.every((type) => restrictedTypes.includes(type))).toBe(true);
  });

  it.each([1, 2, 3, 5, 8])("swaps only one of two flags at earlier sample count %i when due", (earlierSampleCount) => {
    const flags = restrictedTypes.slice(0, 2);
    const previous = { ...mockAnalytics, lrTopPriorityLogicTypes: flags };
    const result = create(5, { previous, earlierSampleCount }).lrTopPriorityLogicTypes;
    expect(result).toHaveLength(2);
    expect(new Set(result).size).toBe(2);
    expect(result.every((type) => restrictedTypes.includes(type))).toBe(true);
    if ([2, 5, 8].includes(earlierSampleCount)) {
      expect(result.filter((type) => flags.includes(type))).toHaveLength(1);
    } else expect(result).toEqual(flags);
  });

  it("keeps flags when every restricted candidate is already flagged", () => {
    const previous = { ...mockAnalytics, lrTopPriorityLogicTypes: restrictedTypes };
    expect(create(5, { previous, earlierSampleCount: 5 }).lrTopPriorityLogicTypes).toEqual(restrictedTypes);
  });

  it("drops non-restricted flags and chooses initial flags if none remain", () => {
    for (const flags of [[], ["Diagram"], ["Diagram", restrictedTypes[0]]] as LRLogicType[][]) {
      const previous = { ...mockAnalytics, lrTopPriorityLogicTypes: flags };
      const result = create(2000, { previous, earlierSampleCount: 3 }).lrTopPriorityLogicTypes;
      expect([1, 2]).toContain(result.length);
      expect(result.every((type) => restrictedTypes.includes(type))).toBe(true);
      if (flags.length === 2) expect(result).toEqual([restrictedTypes[0]]);
    }
  });

  it("omits restricted accuracy even when the previous snapshot contains it", () => {
    const previous = { ...mockAnalytics, lrAccuracyByType: { ...mockAnalytics.lrAccuracyByType, [restrictedTypes[0]]: 0.6 } };
    const result = create(42, { previous });
    expect(Object.keys(result.lrAccuracyByType).sort()).toEqual([...regularTypes].sort());
    for (const type of restrictedTypes) expect(result.lrAccuracyByType).not.toHaveProperty(type);
  });


  it("starts RC passage types from the score profile and moves them with the direction", () => {
    const first = create(3);
    expect(first.rcAccuracyByType).toEqual({ Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 });
    expect(create(3, { currentScore: 149 }).rcAccuracyByType.Law).toBeCloseTo(0.48);

    const previous = { ...mockAnalytics, rcAccuracyByType: first.rcAccuracyByType };
    const improving = create(4, { previous, direction: "improving" }).rcAccuracyByType;
    const slipping = create(4, { previous, direction: "slipping" }).rcAccuracyByType;
    const steady = create(4, { previous, direction: "steady" }).rcAccuracyByType;
    for (const type of ["Law", "Comparative", "Science", "Humanities", "Art"] as const) {
      const before = Math.round(first.rcAccuracyByType[type]! * 100);
      expect(Math.round(improving[type]! * 100) - before).toBeGreaterThanOrEqual(1);
      expect(Math.round(improving[type]! * 100) - before).toBeLessThanOrEqual(3);
      expect(before - Math.round(slipping[type]! * 100)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(Math.round(steady[type]! * 100) - before)).toBe(1);
    }
  });
});

