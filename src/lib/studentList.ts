import type { PlanStatus } from "./planStatus";

export type PlanKind = PlanStatus["kind"];
export type ThisWeek = "ready" | "held" | "none";

export const THIS_WEEK_LABELS: Record<ThisWeek, string> = { ready: "Ready", held: "Held", none: "None" };

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  plan: PlanKind;
  needsAnalytics: boolean;
  thisWeek: ThisWeek;
  weeklyMinutes: number;
  goalTestDate: string;
  joinedAt: Date;
};

export const PLAN_FILTER_KEYS = ["all", "paid", "free_week", "trouble", "no_plan"] as const;
export type PlanFilter = (typeof PLAN_FILTER_KEYS)[number];
export const SORT_KEYS = ["name", "newest", "plan"] as const;
export type Sort = (typeof SORT_KEYS)[number];
export type ListState = { q: string; plan: PlanFilter; analytics: boolean; week: boolean; sort: Sort };

export const LIST_START: ListState = { q: "", plan: "all", analytics: false, week: false, sort: "name" };

export const PLAN_FILTERS: Record<PlanFilter, { label: string; test: (row: StudentRow) => boolean }> = {
  all: { label: "All students", test: () => true },
  paid: { label: "Paid", test: (row) => row.plan === "paid" },
  free_week: { label: "Free week", test: (row) => row.plan === "free_week" },
  trouble: { label: "Retrying or lapsed", test: (row) => row.plan === "retrying" || row.plan === "lapsed" },
  no_plan: { label: "No plan", test: (row) => row.plan === "no_plan" },
};

export const SORTS: Record<Sort, string> = { name: "Name", newest: "Newest", plan: "Plan status" };

const PLAN_ORDER: Record<PlanKind, number> = { retrying: 0, lapsed: 1, no_plan: 2, free_week: 3, paid: 4, admin: 5 };

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
export const displayName = (row: Pick<StudentRow, "name">) => row.name.trim() || null;
const byName = (a: StudentRow, b: StudentRow) =>
  (displayName(a) ?? a.email).localeCompare(displayName(b) ?? b.email, "en", { sensitivity: "base" });

const COMPARE: Record<Sort, (a: StudentRow, b: StudentRow) => number> = {
  name: byName,
  newest: (a, b) => b.joinedAt.getTime() - a.joinedAt.getTime() || byName(a, b),
  plan: (a, b) => PLAN_ORDER[a.plan] - PLAN_ORDER[b.plan] || byName(a, b),
};

export function visible(rows: StudentRow[], state: ListState): StudentRow[] {
  const q = fold(state.q.trim());
  return rows
    .filter((row) =>
      PLAN_FILTERS[state.plan].test(row)
      && (!state.analytics || row.needsAnalytics)
      && (!state.week || row.thisWeek === "ready")
      && (!q || fold(`${row.name} ${row.email}`).includes(q)))
    .toSorted(COMPARE[state.sort]);
}

export const narrowed = (state: ListState) => state.q.trim() !== "" || state.plan !== "all" || state.analytics || state.week;
export const cleared = (state: ListState): ListState => ({ ...LIST_START, sort: state.sort });

export type Counts = Record<PlanFilter, number> & { analytics: number; week: number };

export function countsOf(rows: StudentRow[]): Counts {
  const count = (test: (row: StudentRow) => boolean) => rows.filter(test).length;
  return {
    all: rows.length,
    paid: count(PLAN_FILTERS.paid.test),
    free_week: count(PLAN_FILTERS.free_week.test),
    trouble: count(PLAN_FILTERS.trouble.test),
    no_plan: count(PLAN_FILTERS.no_plan.test),
    analytics: count((row) => row.needsAnalytics),
    week: count((row) => row.thisWeek === "ready"),
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function isOption<T extends string>(options: Record<T, unknown>, value: unknown): value is T {
  return typeof value === "string" && Object.hasOwn(options, value);
}

export function listStateFrom(params: SearchParams): ListState {
  return {
    q: typeof params.q === "string" ? params.q : "",
    plan: isOption(PLAN_FILTERS, params.plan) ? params.plan : LIST_START.plan,
    analytics: params.analytics === "needed",
    week: params.week === "ready",
    sort: isOption(SORTS, params.sort) ? params.sort : LIST_START.sort,
  };
}

export function listQuery(state: ListState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.plan !== "all") params.set("plan", state.plan);
  if (state.analytics) params.set("analytics", "needed");
  if (state.week) params.set("week", "ready");
  if (state.sort !== "name") params.set("sort", state.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}
