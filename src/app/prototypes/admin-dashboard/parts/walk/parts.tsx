"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui/classes";
import { PRESS } from "../chrome";
import { UNEXPECTED_FAILURE_MESSAGE } from "@/lib/unexpectedFailure";
import { MAX_AHEAD_DAYS, addDays, dayName, dayNumber, mondayOf, weekday } from "./model";
import type { WalkState } from "./useWalk";

const QUIET = cx("flex h-10 items-center justify-center gap-1.5 rounded-pill border border-vellum-line bg-paper px-4 text-small font-medium whitespace-nowrap text-ink shadow-control pointer-hover:enabled:hover:bg-vellum disabled:cursor-not-allowed disabled:opacity-50", PRESS);
const DANGER = cx("flex h-10 items-center justify-center rounded-pill bg-danger-ink px-[18px] text-small font-medium whitespace-nowrap text-chalk disabled:opacity-60", PRESS);

export function StartOver({ w }: { w: WalkState }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(w.done);
  if (seen !== w.done) {
    setSeen(w.done);
    setOpen(false);
  }
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) cancel.current?.focus(); }, [open]);
  if (!open) return <button type="button" disabled={!!w.busy} onClick={() => setOpen(true)} className={cx(QUIET, "w-fit")}>Start over</button>;
  return (
    <div role="group" aria-label="Start over: confirm" className="walk-confirm-in flex flex-col gap-3 rounded-md border border-vellum-line bg-vellum p-4 text-small">
      <dl className="flex flex-col gap-1.5">
        <div><dt className="inline font-medium text-ink">Deletes </dt><dd className="inline text-smoke">all weekly schedules, activity check-ins, analytics snapshots, practice-test results and study settings on your student side.</dd></div>
        <div><dt className="inline font-medium text-ink">Keeps </dt><dd className="inline text-smoke">your admin account.</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button ref={cancel} type="button" onClick={() => setOpen(false)} disabled={w.busy === "start-over"} className={QUIET}>Cancel</button>
        <button type="button" onClick={w.startOver} disabled={!!w.busy} className={DANGER}>{w.busy === "start-over" ? "Starting over…" : "Confirm start over"}</button>
      </div>
    </div>
  );
}

export function Notice({ w }: { w: WalkState }) {
  return (
    <>
      <p aria-live="polite" className="sr-only">{w.busy ? "Updating…" : w.failed ? UNEXPECTED_FAILURE_MESSAGE : w.notice}</p>
      {w.failed && <p aria-hidden className="walk-confirm-in rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-danger-ink shadow-control">{UNEXPECTED_FAILURE_MESSAGE}</p>}
      {w.notice && (
        <p key={w.notice} aria-hidden className="walk-confirm-in flex items-center gap-2 rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink shadow-control">
          <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-success-ink"><path d="m5 10.5 3 3 7-7" /></svg>
          {w.notice}
        </p>
      )}
    </>
  );
}

const monthStart = (iso: string) => `${iso.slice(0, 8)}01`;
const shiftMonth = (first: string, by: number) => {
  const d = new Date(`${first}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 10);
};
const monthName = (first: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T12:00:00Z`));
const HEAD = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const ARROW = cx("flex size-10 items-center justify-center rounded-pill text-ink pointer-hover:enabled:hover:bg-vellum disabled:text-fog", PRESS);

export function Calendar({ w }: { w: WalkState }) {
  const { facts: f, busy } = w;
  const last = addDays(f.today, MAX_AHEAD_DAYS);
  const [month, setMonth] = useState(() => monthStart(f.today));
  const [seen, setSeen] = useState(f.today);
  if (seen !== f.today) {
    setSeen(f.today);
    setMonth(monthStart(f.today));
  }
  const gridStart = mondayOf(month);
  const next = shiftMonth(month, 1);
  const days = Array.from({ length: Math.ceil((dayNumber(addDays(next, -1)) + weekday(month)) / 7) * 7 }, (_, i) => addDays(gridStart, i));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p aria-live="polite" className="text-small font-medium text-ink">{monthName(month)}</p>
        <div className="-mr-2 flex">
          <button type="button" aria-label="Earlier month" disabled={month <= monthStart(f.today)} onClick={() => setMonth(shiftMonth(month, -1))} className={ARROW}>
            <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="m12 5-5 5 5 5" /></svg>
          </button>
          <button type="button" aria-label="Later month" disabled={next > last} onClick={() => setMonth(next)} className={ARROW}>
            <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="m8 5 5 5-5 5" /></svg>
          </button>
        </div>
      </div>
      <div role="grid" aria-label={monthName(month)} className="grid grid-cols-7 gap-1">
        {HEAD.map((d) => <span key={d} role="columnheader" className="pb-1 text-center text-caption text-smoke">{d}</span>)}
        {days.map((day) => {
          const inMonth = day.slice(0, 7) === month.slice(0, 7);
          const today = day === f.today;
          const off = day <= f.today || day > last;
          const saved = f.saved.includes(mondayOf(day));
          if (!inMonth) return <span key={day} aria-hidden />;
          return (
            <button key={day} type="button" disabled={off || !!busy} aria-current={today ? "date" : undefined}
              aria-label={today ? `${dayName(day)}, today` : off ? `${dayName(day)}, not available` : `Move to ${dayName(day)}`}
              onClick={() => w.move(day)}
              className={cx("relative flex h-10 items-center justify-center rounded-md text-small font-medium tabular-nums disabled:cursor-default", PRESS,
                today ? "bg-ink text-chalk" : off ? "text-fog" : "text-ink pointer-hover:enabled:hover:bg-vellum")}>
              {dayNumber(day)}
              {saved && !today && <span aria-hidden className={cx("absolute bottom-1 size-1 rounded-pill", off ? "bg-fog" : "bg-smoke")} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
