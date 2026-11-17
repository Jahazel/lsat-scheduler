"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FOCUS, FOCUS_INSET, cx } from "@/components/ui/classes";
import { formatDuration } from "@/lib/formatDuration";
import { planStatusLabel } from "@/lib/planStatus";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import {
  PLAN_FILTERS, PLAN_FILTER_KEYS, SORTS, SORT_KEYS, cleared, countsOf, displayName, listQuery, listStateFrom, narrowed, visible,
  type Counts, type ListState, type Sort, type StudentRow,
} from "@/lib/studentList";

type Change = (change: Partial<ListState>) => void;

const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";
const PRESS = "transition-[color,background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) active:scale-[0.97] motion-reduce:active:scale-100";
const PILL = cx("flex h-10 items-center gap-1.5 rounded-pill border bg-paper px-4 text-small whitespace-nowrap text-ink shadow-control pointer-hover:hover:bg-vellum", PRESS, FOCUS);

const testMonth = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const joinedDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: SCHEDULE_TIMEZONE });
const studentHref = (row: StudentRow) => `/admin/students/${row.id}`;
const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

function Badge({ children, tone = "plain" }: { children: string; tone?: "plain" | "accent" }) {
  return (
    <span className={cx("inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-caption font-medium whitespace-nowrap", tone === "accent" ? "bg-accent/tint text-accent" : "bg-vellum text-smoke")}>
      {children}
    </span>
  );
}

const PlanBadge = ({ row }: { row: StudentRow }) => <Badge>{planStatusLabel({ kind: row.plan })}</Badge>;

function Name({ row, className }: { row: StudentRow; className?: string }) {
  const name = displayName(row);
  return <span className={cx("min-w-0 font-medium [overflow-wrap:anywhere]", name ? "text-ink" : "text-smoke italic", className)}>{name ?? "No name"}</span>;
}

function Summary({ counts }: { counts: Counts }) {
  const parts: [number, string][] = [
    [counts.all, counts.all === 1 ? "student" : "students"],
    [counts.paid, "on a paid plan"],
    [counts.free_week, "in a free week"],
    [counts.trouble, "retrying or lapsed"],
    [counts.analytics, counts.analytics === 1 ? "needs analytics" : "need analytics"],
    [counts.week, counts.week === 1 ? "has this week's schedule" : "have this week's schedule"],
  ];
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-small text-smoke">
      {parts.map(([n, label]) => (
        <span key={label}><span className="font-semibold text-ink tabular-nums">{n.toLocaleString("en-US")}</span> {label}</span>
      ))}
    </p>
  );
}

function SearchField({ value, onChange, className }: { value: string; onChange: (q: string) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={cx("relative flex h-10 min-w-0 items-center", className)}>
      <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="pointer-events-none absolute left-3.5 size-4 text-fog"><circle cx="9" cy="9" r="5.5" /><path d="m13 13 3.5 3.5" /></svg>
      <input ref={input} type="search" aria-label="Search students" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Name or email"
        className={cx("h-full w-full min-w-0 rounded-pill border border-vellum-line bg-paper pr-9 pl-10 text-body text-ink shadow-control placeholder:text-fog md:text-small [&::-webkit-search-cancel-button]:hidden", FOCUS)} />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => { onChange(""); input.current?.focus(); }}
          className={cx("absolute right-1 flex size-8 items-center justify-center rounded-pill text-smoke pointer-hover:hover:bg-vellum pointer-hover:hover:text-ink", PRESS, FOCUS_INSET)}>
          <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-4"><path d="m6 6 8 8M14 6l-8 8" /></svg>
        </button>
      )}
    </div>
  );
}

const Chevron = () => <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-smoke"><path d="m6 8 4 4 4-4" /></svg>;
const Check = ({ on }: { on: boolean }) => <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cx("size-4 shrink-0", on ? "text-ink" : "text-transparent")}><path d="m5 10.5 3 3 7-7" /></svg>;

function MenuButton({ label, name, children, align = "right", active, closeOnPick }: { label: ReactNode; name: string; children: ReactNode; align?: "left" | "right"; active?: boolean; closeOnPick?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node && root.current?.contains(event.target))) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  return (
    <div ref={root} className="relative shrink-0">
      <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className={cx(PILL, active ? "border-ink font-medium" : "border-vellum-line", open && "bg-vellum")}>
        {label}<Chevron />
      </button>
      {open && (
        <div role="menu" aria-label={name} onClick={closeOnPick ? () => { setOpen(false); trigger.current?.focus(); } : undefined} className={cx("menu-pop absolute top-full z-50 mt-2 flex w-60 max-w-[calc(100vw-2.5rem)] flex-col gap-0.5 rounded-lg border border-vellum-line bg-paper p-1.5 shadow-e3", align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left")}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ on, onClick, kind = "radio", children, count }: { on: boolean; onClick: () => void; kind?: "radio" | "checkbox"; children: string; count?: number }) {
  return (
    <button type="button" role={kind === "radio" ? "menuitemradio" : "menuitemcheckbox"} aria-checked={on} onClick={onClick}
      className={cx("flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-left text-small text-ink pointer-hover:hover:bg-vellum", FOCUS_INSET)}>
      <Check on={on} /><span className={cx("min-w-0 flex-1", on && "font-medium")}>{children}</span>
      {count !== undefined && <span className="text-caption text-smoke tabular-nums">{count.toLocaleString("en-US")}</span>}
    </button>
  );
}

const MenuHeading = ({ children }: { children: string }) => <p role="presentation" className="px-2.5 pt-2 pb-1 text-caption text-smoke">{children}</p>;

const ANALYTICS_LABEL = "Needs analytics";
const WEEK_LABEL = "Has this week's schedule";

function FilterMenu({ state, set, counts }: { state: ListState; set: Change; counts: Counts }) {
  const extra = Number(state.analytics) + Number(state.week);
  const label = state.plan === "all" ? (extra ? `Filter · ${extra}` : "Filter") : `${PLAN_FILTERS[state.plan].label}${extra ? ` +${extra}` : ""}`;
  return (
    <MenuButton name="Filter" label={label} align="left" active={state.plan !== "all" || extra > 0}>
      <MenuHeading>Plan status</MenuHeading>
      {PLAN_FILTER_KEYS.map((key) => (
        <MenuItem key={key} on={state.plan === key} count={counts[key]} onClick={() => set({ plan: key })}>{PLAN_FILTERS[key].label}</MenuItem>
      ))}
      <div role="separator" className="mx-1.5 my-1 h-px bg-vellum-line" />
      <MenuItem kind="checkbox" on={state.analytics} count={counts.analytics} onClick={() => set({ analytics: !state.analytics })}>{ANALYTICS_LABEL}</MenuItem>
      <MenuItem kind="checkbox" on={state.week} count={counts.week} onClick={() => set({ week: !state.week })}>{WEEK_LABEL}</MenuItem>
    </MenuButton>
  );
}

function SortMenu({ sort, set }: { sort: Sort; set: Change }) {
  return (
    <MenuButton name="Sort" closeOnPick label={<><span className="text-smoke">Sort:</span> {SORTS[sort]}</>}>
      {SORT_KEYS.map((key) => (
        <MenuItem key={key} on={sort === key} onClick={() => set({ sort: key })}>{SORTS[key]}</MenuItem>
      ))}
    </MenuButton>
  );
}

function SortHeader({ label, sort, state, set, className }: { label: string; sort?: Sort; state: ListState; set: Change; className?: string }) {
  const on = sort !== undefined && sort === state.sort;
  return (
    <th scope="col" aria-sort={on ? (sort === "newest" ? "descending" : "ascending") : undefined}
      className={cx("h-11 px-4 text-left text-caption font-medium whitespace-nowrap text-smoke first:pl-5", className)}>
      {sort ? (
        <button type="button" onClick={() => set({ sort })} className={cx("-mx-1.5 flex h-8 items-center gap-1 rounded-sm px-1.5 pointer-hover:hover:text-ink", on && "text-ink", FOCUS_INSET)}>
          {label}<span aria-hidden className={cx("text-[10px]", !on && "invisible")}>{sort === "newest" ? "↓" : "↑"}</span>
        </button>
      ) : label}
    </th>
  );
}

function TableRow({ row }: { row: StudentRow }) {
  return (
    <tr className="relative transition-colors duration-(--duration-fast) ease-out pointer-hover:hover:bg-vellum">
      <td className="max-w-80 py-3 pr-4 pl-5">
        <Link href={studentHref(row)} className="flex flex-col outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent">
          <Name row={row} className="text-small" />
          <span className="text-caption [overflow-wrap:anywhere] text-smoke">{row.email}</span>
        </Link>
      </td>
      <td className="px-4"><PlanBadge row={row} /></td>
      <td className="px-4">{row.needsAnalytics ? <Badge tone="accent">Needed</Badge> : <span className="text-small text-smoke">Done</span>}</td>
      <td className="px-4 text-small whitespace-nowrap">{row.hasThisWeek ? <span className="text-ink">Ready</span> : <span className="text-smoke">None</span>}</td>
      <td className="px-4 text-right text-small whitespace-nowrap text-ink tabular-nums">{formatDuration(row.weeklyMinutes)}</td>
      <td className="px-4 text-small whitespace-nowrap text-ink tabular-nums">{testMonth.format(new Date(`${row.goalTestDate}T00:00:00Z`))}</td>
      <td className="pr-5 pl-4 text-small whitespace-nowrap text-smoke tabular-nums">{joinedDay.format(row.joinedAt)}</td>
    </tr>
  );
}

function ListRow({ row }: { row: StudentRow }) {
  return (
    <li>
      <Link href={studentHref(row)} className={cx("flex w-full min-w-0 flex-col gap-1 px-5 py-4 transition-colors duration-(--duration-fast) ease-out pointer-hover:hover:bg-vellum", FOCUS_INSET)}>
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Name row={row} />
          {row.needsAnalytics && <Badge tone="accent">Needs analytics</Badge>}
          <PlanBadge row={row} />
        </span>
        <span className="min-w-0 text-small [overflow-wrap:anywhere] text-smoke">{row.email} · {formatDuration(row.weeklyMinutes)} per week</span>
      </Link>
    </li>
  );
}

function NoMatch({ clear }: { clear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-small text-smoke">No students match.</p>
      <button type="button" onClick={clear} className={cx(PILL, "border-vellum-line font-medium")}>Clear filters</button>
    </div>
  );
}

const choicesIn = (link: string) => listStateFrom(Object.fromEntries(new URLSearchParams(link)));
const linkOf = (state: ListState) => listQuery(state).slice(1);

export function StudentsLedger({ rows }: { rows: StudentRow[] }) {
  const link = useSearchParams().toString();
  const [state, setState] = useState(() => choicesIn(link));
  const [seenLink, setSeenLink] = useState(link);
  // Links this list wrote that Next has not reported back yet. Any other new link is a navigation.
  const [written, setWritten] = useState<string[]>([]);
  if (link !== seenLink) setSeenLink(link);
  if (link === linkOf(state)) {
    if (written.length > 0) setWritten([]);
  } else if (link !== seenLink) {
    const mine = written.lastIndexOf(link);
    if (mine === -1) {
      setState(choicesIn(link));
      setWritten([]);
    } else {
      setWritten(written.slice(mine + 1));
    }
  }
  const show = (next: ListState) => {
    setState(next);
    setWritten((pending) => [...pending, linkOf(next)]);
    window.history.replaceState(null, "", `${window.location.pathname}${listQuery(next)}`);
  };
  const set: Change = (change) => show({ ...state, ...change });
  const clear = () => show(cleared(state));
  const counts = countsOf(rows);
  const shown = visible(rows, state);
  return (
    <div className="flex flex-col gap-5">
      <div data-page-section className="flex flex-col gap-2">
        <h1 className="text-h3 font-semibold text-ink">Students</h1>
        <Summary counts={counts} />
      </div>
      {rows.length === 0 ? (
        <div data-page-section className={cx(CARD, "px-6 py-16 text-center text-small text-smoke")}>No students have completed onboarding yet.</div>
      ) : <>
        <div data-page-section className="flex flex-wrap items-center gap-2">
          <SearchField value={state.q} onChange={(q) => set({ q })} className="basis-full sm:min-w-48 sm:flex-1 sm:basis-auto lg:max-w-sm" />
          <FilterMenu state={state} set={set} counts={counts} />
          <div className="ml-auto sm:ml-0 lg:hidden"><SortMenu sort={state.sort} set={set} /></div>
          {narrowed(state) && <button type="button" onClick={clear} className={cx("hidden min-h-10 rounded-pill px-2 text-small font-medium text-accent sm:block", FOCUS)}>Clear</button>}
          <p aria-live="polite" className="ml-auto hidden text-caption text-smoke lg:block">{plural(shown.length, "student", "students")}</p>
        </div>
        {narrowed(state) && (
          <div className="-mt-2 flex min-h-8 items-center justify-between gap-3 text-caption text-smoke sm:hidden">
            <p>{plural(shown.length, "student", "students")} of {rows.length.toLocaleString("en-US")}</p>
            <button type="button" onClick={clear} className={cx("-my-1 min-h-8 rounded-sm font-medium text-accent", FOCUS)}>Clear filters</button>
          </div>
        )}
        <section data-page-section aria-label="Student list" className={cx(CARD, "overflow-hidden")}>
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
              <tbody className="divide-y divide-vellum-line">{shown.map((row) => <TableRow key={row.id} row={row} />)}</tbody>
            </table>
            <ul className="divide-y divide-vellum-line lg:hidden">{shown.map((row) => <ListRow key={row.id} row={row} />)}</ul>
          </>}
        </section>
      </>}
    </div>
  );
}
