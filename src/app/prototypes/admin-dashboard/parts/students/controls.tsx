"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import { PRESS, useDismiss } from "../chrome";
import { PLAN_LABELS, hours, type Student } from "../data";
import { weeklyMinutes } from "../detail/data";
import { SORTS, type ListState, type Sort } from "./list";

export const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";

export function Badge({ children, tone = "plain" }: { children: string; tone?: "plain" | "accent" }) {
  return <span className={cx("inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-caption font-medium whitespace-nowrap", tone === "accent" ? "bg-accent/10 text-accent" : "bg-vellum text-smoke")}>{children}</span>;
}

export const PlanBadge = ({ student }: { student: Student }) => <Badge>{PLAN_LABELS[student.plan]}</Badge>;

export function Name({ student, className }: { student: Student; className?: string }) {
  return <span className={cx("min-w-0 font-medium break-words", student.name ? "text-ink" : "text-smoke italic", className)}>{student.name ?? "No name"}</span>;
}

export function StudentRow({ student, open }: { student: Student; open: (id: string) => void }) {
  return (
    <li>
      <button type="button" onClick={() => open(student.id)} className="flex w-full min-w-0 flex-col gap-1 px-5 py-4 text-left transition-colors duration-(--duration-fast) ease-out pointer-hover:hover:bg-vellum">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Name student={student} />
          {student.needsAnalytics && <Badge tone="accent">Needs analytics</Badge>}
          <PlanBadge student={student} />
        </span>
        <span className="min-w-0 text-small [overflow-wrap:anywhere] text-smoke">{student.email} · {hours(weeklyMinutes(student))} per week</span>
      </button>
    </li>
  );
}

export function SearchField({ value, onChange, className }: { value: string; onChange: (q: string) => void; className?: string }) {
  return (
    <label className={cx("relative flex h-10 min-w-0 items-center", className)}>
      <span className="sr-only">Search students</span>
      <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="pointer-events-none absolute left-3.5 size-4 text-fog"><circle cx="9" cy="9" r="5.5" /><path d="m13 13 3.5 3.5" /></svg>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Name or email"
        className="h-full w-full min-w-0 rounded-pill border border-vellum-line bg-paper pr-9 pl-10 text-body text-ink shadow-control placeholder:text-fog focus:border-ink focus:outline-none md:text-small [&::-webkit-search-cancel-button]:hidden" />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className={cx("absolute right-1 flex size-8 items-center justify-center rounded-pill text-smoke pointer-hover:hover:bg-vellum pointer-hover:hover:text-ink", PRESS)}>
          <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-4"><path d="m6 6 8 8M14 6l-8 8" /></svg>
        </button>
      )}
    </label>
  );
}

export const Chevron = () => <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-smoke"><path d="m6 8 4 4 4-4" /></svg>;
const Check = ({ on }: { on: boolean }) => <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={cx("size-4 shrink-0", on ? "text-ink" : "text-transparent")}><path d="m5 10.5 3 3 7-7" /></svg>;

export function MenuButton({ label, children, align = "right", active }: { label: ReactNode; children: (close: () => void) => ReactNode; align?: "left" | "right"; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const root = useDismiss(open, close);
  return (
    <div ref={root} className="relative shrink-0">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cx("flex h-10 items-center gap-1.5 rounded-pill border px-4 text-small whitespace-nowrap shadow-control pointer-hover:hover:bg-vellum", PRESS, active ? "border-ink bg-paper font-medium text-ink" : "border-vellum-line bg-paper text-ink", open && "bg-vellum")}>
        {label}<Chevron />
      </button>
      {open && (
        <div role="menu" className={cx("menu-pop absolute top-full z-50 mt-2 flex w-60 flex-col gap-0.5 rounded-lg border border-vellum-line bg-paper p-1.5 shadow-e3", align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left")}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ on, onClick, kind = "radio", children, count }: { on: boolean; onClick: () => void; kind?: "radio" | "checkbox"; children: string; count?: number }) {
  return (
    <button type="button" role={kind === "radio" ? "menuitemradio" : "menuitemcheckbox"} aria-checked={on} onClick={onClick}
      className={cx("flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-left text-small pointer-hover:hover:bg-vellum", on ? "font-medium text-ink" : "text-ink")}>
      <Check on={on} /><span className="min-w-0 flex-1">{children}</span>
      {count !== undefined && <span className="text-caption text-smoke tabular-nums">{count.toLocaleString("en-US")}</span>}
    </button>
  );
}

export const MenuHeading = ({ children }: { children: string }) => <p className="px-2.5 pt-2 pb-1 text-caption text-fog">{children}</p>;

export function SortMenu({ sort, set }: { sort: Sort; set: (change: Partial<ListState>) => void }) {
  return (
    <MenuButton label={<><span className="text-smoke">Sort:</span> {SORTS[sort]}</>}>
      {(close) => (Object.keys(SORTS) as Sort[]).map((key) => (
        <MenuItem key={key} on={sort === key} onClick={() => { set({ sort: key }); close(); }}>{SORTS[key]}</MenuItem>
      ))}
    </MenuButton>
  );
}

export function NoStudents() {
  return <div className={cx(CARD, "px-6 py-16 text-center text-small text-smoke")}>No students have completed onboarding yet.</div>;
}

export function NoMatch({ clear }: { clear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-small text-smoke">No students match.</p>
      <button type="button" onClick={clear} className={cx("h-10 rounded-pill border border-vellum-line bg-paper px-4 text-small font-medium text-ink shadow-control pointer-hover:hover:bg-vellum", PRESS)}>Clear filters</button>
    </div>
  );
}
