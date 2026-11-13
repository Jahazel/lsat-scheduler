"use client";

import { useState } from "react";
import Link from "next/link";
import type { RoadToTestDay } from "@/lib/roadToTestDay";
import { formatScheduleWeekOf } from "@/lib/scheduleCheckInSummary";
import { InfoGlyph, StatusIcon } from "@/components/ui/StatusIcon";
import { FOCUS, cx } from "@/components/ui/classes";

export type WeekCount = { done: number; total: number; dueBeforeToday: number };

const PHONE_NOTES = 2;

function Notes({ notes }: { notes: string[] }) {
  const [open, setOpen] = useState(false);
  if (notes.length === 0) return null;
  const hidden = notes.length - PHONE_NOTES;
  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1.5">
        {notes.map((note, index) => (
          <li key={note} className={cx("gap-2 text-small text-smoke", index >= PHONE_NOTES && !open ? "hidden md:flex" : "flex")}>
            <InfoGlyph className="mt-0.5 size-4" />{note}
          </li>
        ))}
      </ul>
      {hidden > 0 && !open && (
        <button type="button" onClick={() => setOpen(true)}
          className={cx("-my-2 w-fit rounded-sm py-3 pl-5.5 text-small font-medium text-ink underline decoration-vellum-line underline-offset-4 pointer-hover:decoration-ink md:hidden", FOCUS)}>
          Show {hidden} more
        </button>
      )}
    </div>
  );
}

function PacePill({ done, total, dueBeforeToday }: WeekCount) {
  const lead = done - dueBeforeToday;
  const behind = done < total && lead < 0;
  const label = done === total ? "Week done" : behind ? `${-lead} behind` : lead > 0 ? `${lead} ahead` : "On pace";
  return (
    <span className={cx("inline-flex h-6 shrink-0 items-center gap-1 rounded-pill px-2.5 text-caption font-medium whitespace-nowrap",
      behind ? "bg-warning-wash text-warning-ink" : "bg-vellum text-ink")}>
      {behind ? <StatusIcon name="warning" /> : (
        <svg aria-hidden viewBox="0 0 14 14" className="size-3.5 shrink-0">
          <path d="m3 7.3 2.6 2.6L11 4.4" fill="none" className="stroke-current" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {label}
    </span>
  );
}

function Bar({ done, total }: { done: number; total: number }) {
  return (
    <div role="progressbar" aria-label="Activities done this week" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
      className="h-1.5 overflow-hidden rounded-pill bg-vellum-line">
      <div data-summary-fill
        className="h-full origin-left rounded-pill bg-accent transition-transform duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none"
        style={{ transform: `scaleX(${total > 0 ? Math.min(1, done / total) : 0})` }} />
    </div>
  );
}

function roadWords(road: RoadToTestDay) {
  const { left, current, goal, month, year } = road;
  if (left.kind === "test_day") return { heading: "Test day", label: `Test day. ${current} now, goal ${goal}.` };
  if (left.kind === "passed") return null;
  const unit = left.kind === "weeks" ? "week" : "day";
  const count = `${left.count} ${left.count === 1 ? unit : `${unit}s`}`;
  return { heading: `${count} to the ${month} LSAT`, label: `From ${current} now to ${goal} by the ${month} ${year} LSAT, ${count} away.` };
}

function RoadCurve({ road }: { road: RoadToTestDay }) {
  const ticks = road.left.kind === "weeks" ? road.left.count + 1 : 1;
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="relative mx-1.5 h-9">
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <path d="M0 88 C 45 88, 55 12, 100 12" fill="none" className="stroke-accent" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </svg>
        <span className="absolute top-[88%] left-0 size-2.5 -translate-1/2 rounded-pill border-2 border-accent bg-paper" />
        <span className="absolute top-[12%] left-full size-2.5 -translate-1/2 rounded-pill bg-accent" />
      </div>
      <div className={cx("mx-1.5 flex", ticks > 1 ? "justify-between" : "justify-end")}>
        {Array.from({ length: ticks }, (_, index) => (
          <span key={index} className={cx("h-1.5 w-0.5 rounded-pill", index === 0 ? "bg-accent" : "bg-vellum-line")} />
        ))}
      </div>
      <div className="flex justify-between text-caption tabular-nums">
        <span><span className="font-medium text-ink">{road.current}</span> <span className="text-smoke">now</span></span>
        <span><span className="text-smoke">goal</span> <span className="font-medium text-accent">{road.goal}</span></span>
      </div>
    </div>
  );
}

function Road({ road }: { road: RoadToTestDay }) {
  const words = roadWords(road);
  if (!words) return (
    <p className="border-t border-vellum-line pt-4 text-small text-smoke">
      Your {road.month} LSAT has passed. Set your next test date in{" "}
      <Link href="/settings" className={cx("rounded-xs font-medium text-ink underline decoration-vellum-line underline-offset-4 pointer-hover:decoration-ink", FOCUS)}>
        Study settings
      </Link>.
    </p>
  );
  return (
    <div role="img" aria-label={words.label} className="flex flex-col gap-2 border-t border-vellum-line pt-4">
      <p className="text-small text-smoke">{words.heading}</p>
      <RoadCurve road={road} />
    </div>
  );
}

function Count({ count, preview }: { count: WeekCount; preview: boolean }) {
  if (preview) return (
    <p className="text-small text-smoke">
      <span className="text-h4 font-semibold text-ink tabular-nums">{count.total}</span> {count.total === 1 ? "activity" : "activities"} planned
    </p>
  );
  if (count.total === 0) return <p className="text-small text-smoke">Nothing planned this week.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite" className="flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="text-h4 font-semibold text-ink tabular-nums">{count.done}</span>
          <span className="text-small text-smoke tabular-nums">of {count.total} done</span>
        </p>
        <PacePill {...count} />
      </div>
      <Bar done={count.done} total={count.total} />
    </div>
  );
}

const previewStart = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

export function WeekHeader({ weekOf, preview, notes, count, road, className }: {
  weekOf: string;
  preview: boolean;
  notes: string[];
  count: WeekCount;
  road: RoadToTestDay;
  className?: string;
}) {
  return (
    <header className={cx("flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:pt-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-small text-smoke">{preview ? `Next week · starts ${previewStart.format(new Date(`${weekOf}T00:00:00.000Z`))}` : `Week of ${formatScheduleWeekOf(weekOf)}`}</p>
          <h1 className="text-h3 font-semibold text-balance text-ink">{preview ? "Your plan for next week" : "Your plan for this week"}</h1>
          <p className="text-body text-smoke">{preview ? "Your upload is saved. Check-ins open on Monday." : "Your plan is set. Check off as you go."}</p>
        </div>
        <Notes notes={notes} />
      </div>
      <section aria-label="Week summary" className="flex flex-col gap-4 rounded-lg border border-vellum-line bg-paper p-5 shadow-control lg:w-80 lg:shrink-0">
        <Count count={count} preview={preview} />
        <Road road={road} />
      </section>
    </header>
  );
}
