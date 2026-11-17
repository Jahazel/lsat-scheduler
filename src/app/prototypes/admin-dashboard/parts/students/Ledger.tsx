"use client";

import { cx } from "@/components/ui/classes";
import { hours, type Student } from "../data";
import { weeklyMinutes } from "../detail/data";
import { Badge, CARD, MenuButton, MenuHeading, MenuItem, Name, NoMatch, NoStudents, PlanBadge, SearchField, SortMenu, StudentRow } from "./controls";
import { ANALYTICS_LABEL, PLAN_FILTERS, WEEK_LABEL, cleared, countsOf, narrowed, plural, visible, type Counts, type ListProps, type ListState, type PlanFilter, type Sort } from "./list";

function Summary({ counts }: { counts: Counts }) {
  const parts: [number, string][] = [
    [counts.paid, "on a paid plan"],
    [counts.free_week, "in a free week"],
    [counts.trouble, "retrying or lapsed"],
    [counts.analytics, counts.analytics === 1 ? "needs analytics" : "need analytics"],
    [counts.week, counts.week === 1 ? "has this week's schedule" : "have this week's schedule"],
  ];
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-small text-smoke">
      <span><span className="font-semibold text-ink tabular-nums">{counts.all.toLocaleString("en-US")}</span> {counts.all === 1 ? "student" : "students"}</span>
      {parts.map(([n, label]) => <span key={label}><span className="font-semibold text-ink tabular-nums">{n.toLocaleString("en-US")}</span> {label}</span>)}
    </p>
  );
}

function FilterMenu({ state, set, counts }: { state: ListState; set: ListProps["set"]; counts: Counts }) {
  const extra = Number(state.analytics) + Number(state.week);
  const label = state.plan === "all" ? (extra ? `Filter · ${extra}` : "Filter") : `${PLAN_FILTERS[state.plan].label}${extra ? ` +${extra}` : ""}`;
  return (
    <MenuButton label={label} align="left" active={state.plan !== "all" || extra > 0}>
      {() => <>
        <MenuHeading>Plan status</MenuHeading>
        {(Object.keys(PLAN_FILTERS) as PlanFilter[]).map((key) => (
          <MenuItem key={key} on={state.plan === key} count={counts[key]} onClick={() => set({ plan: key })}>{PLAN_FILTERS[key].label}</MenuItem>
        ))}
        <div className="my-1 h-px bg-vellum-line" />
        <MenuItem kind="checkbox" on={state.analytics} count={counts.analytics} onClick={() => set({ analytics: !state.analytics })}>{ANALYTICS_LABEL}</MenuItem>
        <MenuItem kind="checkbox" on={state.week} count={counts.week} onClick={() => set({ week: !state.week })}>{WEEK_LABEL}</MenuItem>
      </>}
    </MenuButton>
  );
}

function SortHeader({ label, sort, state, set, className }: { label: string; sort?: Sort; state: ListState; set: ListProps["set"]; className?: string }) {
  const on = sort === state.sort;
  return (
    <th scope="col" aria-sort={on ? (sort === "newest" ? "descending" : "ascending") : undefined} className={cx("h-11 px-4 text-left text-caption font-medium whitespace-nowrap text-smoke first:pl-5", className)}>
      {sort ? (
        <button type="button" onClick={() => set({ sort })} className={cx("-mx-1.5 flex h-8 items-center gap-1 rounded-sm px-1.5 pointer-hover:hover:text-ink", on && "text-ink")}>
          {label}<span aria-hidden className={cx("text-[10px]", !on && "invisible")}>{sort === "newest" ? "↓" : "↑"}</span>
        </button>
      ) : label}
    </th>
  );
}

function Row({ student, open }: { student: Student; open: (id: string) => void }) {
  return (
    <tr className="relative transition-colors duration-(--duration-fast) ease-out pointer-hover:hover:bg-vellum">
      <td className="max-w-80 py-3 pr-4 pl-5">
        <button type="button" onClick={() => open(student.id)} className="flex flex-col text-left after:absolute after:inset-0 after:content-['']">
          <Name student={student} className="text-small" />
          <span className="text-caption [overflow-wrap:anywhere] text-smoke">{student.email}</span>
        </button>
      </td>
      <td className="px-4"><PlanBadge student={student} /></td>
      <td className="px-4">{student.needsAnalytics ? <Badge tone="accent">Needed</Badge> : <span className="text-small text-fog">Done</span>}</td>
      <td className="px-4 text-small whitespace-nowrap">{student.hasThisWeek ? <span className="text-ink">Ready</span> : <span className="text-fog">None</span>}</td>
      <td className="px-4 text-right text-small whitespace-nowrap text-ink tabular-nums">{hours(weeklyMinutes(student))}</td>
      <td className="px-4 text-small whitespace-nowrap text-ink tabular-nums">{student.testDate}</td>
      <td className="pr-5 pl-4 text-small whitespace-nowrap text-smoke tabular-nums">{student.joined}</td>
    </tr>
  );
}

export function Ledger({ students, state, set, open }: ListProps) {
  const counts = countsOf(students);
  const shown = visible(students, state);
  const clear = () => set(cleared(state));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-h3 font-semibold text-ink">Students</h1>
        <Summary counts={counts} />
      </div>
      {students.length === 0 ? <NoStudents /> : <>
        <div className="flex flex-wrap items-center gap-2">
          <SearchField value={state.q} onChange={(q) => set({ q })} className="basis-full sm:min-w-48 sm:flex-1 sm:basis-auto lg:max-w-sm" />
          <FilterMenu state={state} set={set} counts={counts} />
          <div className="ml-auto sm:ml-0 lg:hidden"><SortMenu sort={state.sort} set={set} /></div>
          {narrowed(state) && <button type="button" onClick={clear} className="hidden min-h-10 px-2 text-small font-medium text-accent sm:block">Clear</button>}
          <p aria-live="polite" className="ml-auto hidden text-caption text-smoke lg:block">{plural(shown.length, "student", "students")}</p>
        </div>
        {narrowed(state) && (
          <div className="-mt-2 flex min-h-8 items-center justify-between gap-3 text-caption text-smoke sm:hidden">
            <p>{plural(shown.length, "student", "students")} of {students.length.toLocaleString("en-US")}</p>
            <button type="button" onClick={clear} className="-my-1 min-h-8 font-medium text-accent">Clear filters</button>
          </div>
        )}
        <section aria-label="Student list" className={cx(CARD, "overflow-hidden")}>
          {shown.length === 0 ? <NoMatch clear={clear} /> : <>
            <table className="hidden w-full lg:table">
              <thead className="border-b border-vellum-line bg-vellum/50">
                <tr>
                  <SortHeader label="Student" sort="name" state={state} set={set} />
                  <SortHeader label="Plan" sort="plan" state={state} set={set} />
                  <SortHeader label="Analytics" state={state} set={set} />
                  <SortHeader label="This week" state={state} set={set} />
                  <SortHeader label="Study time" state={state} set={set} className="text-right" />
                  <SortHeader label="Test" state={state} set={set} />
                  <SortHeader label="Joined" sort="newest" state={state} set={set} className="pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-vellum-line">{shown.map((s) => <Row key={s.id} student={s} open={open} />)}</tbody>
            </table>
            <ul className="divide-y divide-vellum-line lg:hidden">{shown.map((s) => <StudentRow key={s.id} student={s} open={open} />)}</ul>
          </>}
        </section>
      </>}
    </div>
  );
}

const SHAPE = "rounded bg-vellum-line";

export function LedgerLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy aria-label="Loading students">
      <div className="flex flex-col gap-2">
        <h1 className="text-h3 font-semibold text-ink">Students</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-2 py-0.5">{[20, 28, 26, 30, 28, 40].map((w, i) => <span key={i} className={cx(SHAPE, "h-3.5")} style={{ width: `${w * 4}px` }} />)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx(SHAPE, "h-10 basis-full rounded-pill sm:flex-1 sm:basis-auto lg:max-w-sm")} />
        <span className={cx(SHAPE, "h-10 w-24 rounded-pill")} />
        <span className={cx(SHAPE, "ml-auto h-10 w-32 rounded-pill sm:ml-0 lg:hidden")} />
      </div>
      <div className={cx(CARD, "overflow-hidden")}>
        <div className="hidden h-11 items-center gap-4 border-b border-vellum-line bg-vellum/50 px-5 lg:flex"><span className={cx(SHAPE, "h-3 w-16")} /></div>
        <ul className="divide-y divide-vellum-line">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-4 lg:py-3">
              <span className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-60"><span className={cx(SHAPE, "h-3.5 w-36")} /><span className={cx(SHAPE, "h-3 w-48 max-w-full")} /></span>
              <span className={cx(SHAPE, "hidden h-5 w-16 rounded-pill lg:block")} />
              <span className={cx(SHAPE, "ml-auto hidden h-3 w-full max-w-md lg:block")} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
