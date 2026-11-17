import type { PlanKind, Student } from "../data";

export type PlanFilter = "all" | "paid" | "free_week" | "trouble" | "no_plan";
export type Sort = "name" | "newest" | "plan";
export type ListState = { q: string; plan: PlanFilter; analytics: boolean; week: boolean; sort: Sort };
export const LIST_START: ListState = { q: "", plan: "all", analytics: false, week: false, sort: "name" };

export const PLAN_FILTERS: Record<PlanFilter, { label: string; test: (s: Student) => boolean }> = {
  all: { label: "All students", test: () => true },
  paid: { label: "Paid", test: (s) => s.plan === "paid" },
  free_week: { label: "Free week", test: (s) => s.plan === "free_week" },
  trouble: { label: "Retrying or lapsed", test: (s) => s.plan === "retrying" || s.plan === "lapsed" },
  no_plan: { label: "No plan", test: (s) => s.plan === "no_plan" },
};
export const ANALYTICS_LABEL = "Needs analytics";
export const WEEK_LABEL = "Has this week's schedule";

export const SORTS: Record<Sort, string> = { name: "Name", newest: "Newest", plan: "Plan status" };
const PLAN_ORDER: Record<PlanKind, number> = { retrying: 0, lapsed: 1, no_plan: 2, free_week: 3, paid: 4 };

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
const joinedAt = (s: Student) => Date.parse(`${s.joined}, 2026`);
const byName = (a: Student, b: Student) => (a.name ?? a.email).localeCompare(b.name ?? b.email, undefined, { sensitivity: "base" });

export function visible(students: Student[], state: ListState): Student[] {
  const q = fold(state.q.trim());
  const shown = students.filter((s) =>
    PLAN_FILTERS[state.plan].test(s)
    && (!state.analytics || s.needsAnalytics)
    && (!state.week || s.hasThisWeek)
    && (!q || fold(`${s.name ?? ""} ${s.email}`).includes(q)));
  const compare = { name: byName, newest: (a: Student, b: Student) => joinedAt(b) - joinedAt(a) || byName(a, b), plan: (a: Student, b: Student) => PLAN_ORDER[a.plan] - PLAN_ORDER[b.plan] || byName(a, b) }[state.sort];
  return shown.toSorted(compare);
}

export const narrowed = (state: ListState) => state.q.trim() !== "" || state.plan !== "all" || state.analytics || state.week;
export const cleared = (state: ListState): ListState => ({ ...LIST_START, sort: state.sort });

export type Counts = Record<PlanFilter, number> & { analytics: number; week: number };
export function countsOf(students: Student[]): Counts {
  const plans = Object.fromEntries(Object.entries(PLAN_FILTERS).map(([key, f]) => [key, students.filter(f.test).length])) as Record<PlanFilter, number>;
  return { ...plans, analytics: students.filter((s) => s.needsAnalytics).length, week: students.filter((s) => s.hasThisWeek).length };
}

export const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export type ListProps = { students: Student[]; state: ListState; set: (change: Partial<ListState>) => void; open: (id: string) => void };
