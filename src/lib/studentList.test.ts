import { describe, expect, it } from "vitest";
import {
  LIST_START, THIS_WEEK_LABELS, cleared, countsOf, listQuery, listStateFrom, narrowed, visible, type ListState, type StudentRow,
} from "./studentList";

const row = (name: string, extra: Partial<StudentRow> = {}): StudentRow => ({
  id: name || extra.email || "id",
  name,
  email: `${name.toLowerCase() || "nobody"}@example.test`,
  plan: "paid",
  needsAnalytics: false,
  thisWeek: "ready",
  weeklyMinutes: 600,
  goalTestDate: "2027-01-01",
  joinedAt: new Date("2026-10-01T12:00:00Z"),
  ...extra,
});

const ROWS = [
  row("Maya", { plan: "paid", joinedAt: new Date("2026-09-02T12:00:00Z") }),
  row("Daniel", { plan: "free_week", needsAnalytics: true, joinedAt: new Date("2026-11-09T12:00:00Z") }),
  row("Priya", { plan: "retrying", joinedAt: new Date("2026-10-05T12:00:00Z") }),
  row("Lucas", { plan: "lapsed", thisWeek: "none", joinedAt: new Date("2026-08-17T12:00:00Z") }),
  row("Hannah", { plan: "no_plan", needsAnalytics: true, thisWeek: "none", joinedAt: new Date("2026-11-12T12:00:00Z") }),
];

const names = (rows: StudentRow[]) => rows.map((r) => r.name);
const show = (change: Partial<ListState>) => names(visible(ROWS, { ...LIST_START, ...change }));

describe("counts", () => {
  it("counts students, each plan group, who needs analytics, and who has this week's schedule", () => {
    expect(countsOf(ROWS)).toEqual({ all: 5, paid: 1, free_week: 1, trouble: 2, no_plan: 1, analytics: 2, week: 3 });
  });

  it("are all zero with no students", () => {
    expect(countsOf([])).toEqual({ all: 0, paid: 0, free_week: 0, trouble: 0, no_plan: 0, analytics: 0, week: 0 });
  });
});

describe("a held week", () => {
  const rows = [...ROWS, row("Omar", { plan: "free_week", thisWeek: "held" })];

  it("is not counted as having this week's schedule", () => {
    expect(countsOf(rows).week).toBe(3);
  });

  it("does not match Has this week's schedule", () => {
    expect(names(visible(rows, { ...LIST_START, week: true }))).toEqual(["Daniel", "Maya", "Priya"]);
    expect(names(visible(rows, LIST_START))).toContain("Omar");
  });

  it("reads Held, apart from Ready and None", () => {
    expect(THIS_WEEK_LABELS).toEqual({ ready: "Ready", held: "Held", none: "None" });
  });
});

describe("sort", () => {
  it("by name ignores case", () => {
    expect(names(visible([row("bea"), row("Amy"), row("Cy")], LIST_START))).toEqual(["Amy", "bea", "Cy"]);
  });

  it("by name puts a student with no name under their email", () => {
    const rows = [row("Kim"), row("", { email: "ann@example.test" }), row("Bo")];
    expect(visible(rows, LIST_START).map((r) => r.name || r.email)).toEqual(["ann@example.test", "Bo", "Kim"]);
  });

  it("newest puts the latest join first", () => {
    expect(show({ sort: "newest" })).toEqual(["Hannah", "Daniel", "Priya", "Maya", "Lucas"]);
  });

  it("plan status puts Retrying and Lapsed first, then No plan, Free week, Paid", () => {
    expect(show({ sort: "plan" })).toEqual(["Priya", "Lucas", "Hannah", "Daniel", "Maya"]);
  });

  it("plan status orders students with the same plan by name", () => {
    expect(names(visible([row("Zoe"), row("Al")], { ...LIST_START, sort: "plan" }))).toEqual(["Al", "Zoe"]);
  });
});

describe("search and filter", () => {
  it("search matches part of a name or an email, ignoring case and accents", () => {
    expect(show({ q: "  HAN " })).toEqual(["Hannah"]);
    expect(show({ q: "lucas@" })).toEqual(["Lucas"]);
    expect(names(visible([row("Zoë"), row("Ann")], { ...LIST_START, q: "zoe" }))).toEqual(["Zoë"]);
  });

  it("the plan filter keeps one plan group; Retrying or lapsed keeps both", () => {
    expect(show({ plan: "trouble" })).toEqual(["Lucas", "Priya"]);
    expect(show({ plan: "no_plan" })).toEqual(["Hannah"]);
  });

  it("Needs analytics and Has this week's schedule narrow together", () => {
    expect(show({ analytics: true })).toEqual(["Daniel", "Hannah"]);
    expect(show({ analytics: true, week: true })).toEqual(["Daniel"]);
  });

  it("can match nobody", () => {
    expect(show({ q: "zzzz" })).toEqual([]);
  });

  it("Clear filters keeps the sort and drops everything else", () => {
    const state: ListState = { q: "a", plan: "paid", analytics: true, week: true, sort: "plan" };
    expect(narrowed(state)).toBe(true);
    expect(cleared(state)).toEqual({ ...LIST_START, sort: "plan" });
    expect(narrowed(cleared(state))).toBe(false);
  });
});

describe("page link", () => {
  it("keeps every choice through a reload", () => {
    const state: ListState = { q: "maya t&", plan: "trouble", analytics: true, week: true, sort: "newest" };
    const query = listQuery(state);
    expect(listStateFrom(Object.fromEntries(new URLSearchParams(query)))).toEqual(state);
  });

  it("is the bare page with the start choices", () => {
    expect(listQuery(LIST_START)).toBe("");
    expect(listStateFrom({})).toEqual(LIST_START);
  });

  it("falls back to the start for values it cannot read", () => {
    expect(listStateFrom({ q: ["a", "b"], plan: "gold", analytics: "yes", sort: "toString" })).toEqual(LIST_START);
  });
});
