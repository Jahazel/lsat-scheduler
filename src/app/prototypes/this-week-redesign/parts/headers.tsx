"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import type { View } from "../view";
import { pace, type Week } from "./data";
import { Icon } from "./icons";

export type HeaderVariantProps = { view: View; week: Week; done: Set<string>; preview: boolean; days: ReactNode; go: (page: string) => void };

function summary({ view, week, done, preview }: Pick<HeaderVariantProps, "view" | "week" | "done" | "preview">) {
  const p = pace(week, view.today, done);
  const finished = p.total > 0 && p.done === p.total;
  return {
    ...p,
    paceLabel: finished ? "Week done" : p.label,
    eyebrow: preview ? "Next week · starts Monday, Nov 16" : `Week of ${week.weekOf}`,
    title: preview ? "Your plan for next week" : "Your plan for this week",
    lead: preview ? "Your upload is saved. Check-ins open on Monday." : "Your plan is set. Check off as you go.",
  };
}
type Summary = ReturnType<typeof summary>;

// Ticking a row happens many times a day: the fill moves on transform only, short and strong ease-out, still under reduced motion.
function Bar({ done, total }: { done: number; total: number }) {
  const share = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  return (
    <div role="progressbar" aria-label="Activities done this week" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
      className="h-1.5 overflow-hidden rounded-pill bg-vellum-line">
      <div className="h-full origin-left rounded-pill bg-accent transition-transform duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none"
        style={{ transform: `scaleX(${share})` }} />
    </div>
  );
}

function PacePill({ s }: { s: Summary }) {
  return (
    <span className={cx("inline-flex h-6 shrink-0 items-center gap-1 rounded-pill px-2.5 text-caption font-medium whitespace-nowrap",
      s.behind ? "bg-warning-wash text-warning-ink" : "bg-vellum text-ink")}>
      <Icon name={s.behind ? "warning" : "check"} className="size-3.5" />
      {s.paceLabel}
    </span>
  );
}

const PHONE_NOTES = 2;

// Phones show the first two notes so the summary card and today stay near the top; wider screens show every note.
function Notes({ notes }: { notes: string[] }) {
  const [open, setOpen] = useState(false);
  if (notes.length === 0) return null;
  const hidden = notes.length - PHONE_NOTES;
  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1.5">
        {notes.map((n, i) => (
          <li key={n} className={cx("gap-2 text-small text-smoke", i >= PHONE_NOTES && !open ? "hidden md:flex" : "flex")}>
            <Icon name="info" className="mt-px size-4 shrink-0" />{n}
          </li>
        ))}
      </ul>
      {hidden > 0 && !open && (
        <button type="button" onClick={() => setOpen(true)}
          className="-my-2 w-fit rounded-sm py-2 pl-6 text-small font-medium text-ink underline decoration-vellum-line underline-offset-4 pointer-hover:decoration-ink md:hidden">
          Show {hidden} more
        </button>
      )}
    </div>
  );
}

// Under a week out, the road counts days, so it never says "0 weeks".
function road(week: Week) {
  const { weeksAway, daysAway, current, goal, testMonth } = week.student;
  const left = daysAway < 7 ? `${daysAway} ${daysAway === 1 ? "day" : "days"}` : `${weeksAway} ${weeksAway === 1 ? "week" : "weeks"}`;
  const month = testMonth.split(" ")[0];
  return {
    month,
    heading: daysAway === 0 ? "Test day" : `${left} to the ${month} LSAT`,
    label: daysAway === 0 ? `Test day. ${current} now, goal ${goal}.` : `From ${current} now to ${goal} by the ${testMonth} LSAT, ${left} away.`,
  };
}

/* Road to test day: the onboarding score curve at a fixed 36 px height, with one tick per week to test week.
   It always climbs from now (bottom) to goal (top) so the shape fills the space; the numbers under the ends carry the scores.
   The line stretches with the card; the end dots are HTML so they stay round. */
function RoadCurve({ week }: { week: Week }) {
  const { current, goal, weeksAway, daysAway } = week.student;
  const ticks = daysAway < 7 ? 1 : weeksAway + 1;
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="relative mx-1.5 h-9">
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <path d="M0 88 C 45 88, 55 12, 100 12" fill="none" className="stroke-accent" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </svg>
        <span aria-hidden className="absolute top-[88%] left-0 size-2.5 -translate-1/2 rounded-pill border-2 border-accent bg-paper" />
        <span aria-hidden className="absolute top-[12%] left-full size-2.5 -translate-1/2 rounded-pill bg-accent" />
      </div>
      <div aria-hidden className={cx("mx-1.5 flex", ticks > 1 ? "justify-between" : "justify-end")}>
        {Array.from({ length: ticks }, (_, i) => <span key={i} className={cx("h-1.5 w-0.5 rounded-pill", i === 0 ? "bg-accent" : "bg-vellum-line")} />)}
      </div>
      <div className="flex justify-between text-caption tabular-nums">
        <span><span className="font-medium text-ink">{current}</span> <span className="text-smoke">now</span></span>
        <span><span className="text-smoke">goal</span> <span className="font-medium text-accent">{goal}</span></span>
      </div>
    </div>
  );
}

/* Section 2 pick (2026-11-12): today's title-led header, refined, with the Quiet card (count, pace pill, thin bar) and the slim score curve. */
export function WeekHeader(props: HeaderVariantProps) {
  const { week, preview, days, go } = props;
  const s = summary(props);
  const r = road(week);
  const testPassed = week.student.daysAway < 0;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:pt-2">
          <div className="flex flex-col gap-1.5">
            <p className="text-small text-smoke">{s.eyebrow}</p>
            <h1 className="text-h3 font-semibold text-balance text-ink">{s.title}</h1>
            <p className="text-body text-smoke">{s.lead}</p>
          </div>
          <Notes notes={week.notes} />
        </div>
        <section aria-label="Week summary" className="flex flex-col gap-4 rounded-lg border border-vellum-line bg-paper p-5 shadow-control lg:w-80 lg:shrink-0">
          {preview ? (
            <p className="text-small text-smoke"><span className="text-h4 font-semibold text-ink tabular-nums">{s.total}</span> {s.total === 1 ? "activity" : "activities"} planned</p>
          ) : s.total === 0 ? (
            <p className="text-small text-smoke">Nothing planned this week.</p>
          ) : (
            <div className="flex flex-col gap-3" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-baseline gap-1.5"><span className="text-h4 font-semibold text-ink tabular-nums">{s.done}</span><span className="text-small text-smoke tabular-nums">of {s.total} done</span></p>
                <PacePill s={s} />
              </div>
              <Bar done={s.done} total={s.total} />
            </div>
          )}
          {testPassed ? (
            <p className="border-t border-vellum-line pt-4 text-small text-smoke">
              Your {r.month} LSAT has passed. Set your next test date in{" "}
              <button type="button" onClick={() => go("settings")} className="font-medium text-ink underline decoration-vellum-line underline-offset-4 pointer-hover:decoration-ink">Study settings</button>.
            </p>
          ) : (
            <div className="flex flex-col gap-2 border-t border-vellum-line pt-4" role="img" aria-label={r.label}>
              <p className="text-small text-smoke">{r.heading}</p>
              <RoadCurve week={week} />
            </div>
          )}
        </section>
      </header>
      {days}
    </div>
  );
}

export const HEADERS = [{ name: "Quiet + score curve", Header: WeekHeader }];
