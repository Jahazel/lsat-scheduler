"use client";

import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/classes";
import { Columns } from "./columns";
import { RoadToTest } from "./preview";
import { DAYS, DAY_NAMES, TEST_DATES, hours, type Flow } from "./flow";

const NO_DRILLS = "Drills fill in after you add your analytics.";
const RISE_MS = [0, 70, 120, 160, 190];

// Entrance order: delays shrink as the group goes on, so the reveal reads as one wave, not a queue.
const rise = (beat: number): CSSProperties => ({ animationDelay: `${RISE_MS[Math.min(beat, RISE_MS.length - 1)]}ms` });
const grow = (i: number, count: number, start = 140): CSSProperties => ({ animationDelay: `${Math.round(start + 180 * (1 - (1 - i / Math.max(count - 1, 1)) ** 2))}ms` });

// Below 640 px a day tile is about 36 px wide, too narrow for "30 min" or "7 h 45".
const shortHours = (minutes: number) => hours(minutes).replace(" min", "m").replaceAll(" ", "");

function readWeek(flow: Flow) {
  const { values } = flow;
  const date = TEST_DATES.find((d) => d.label === values.testDate);
  const total = DAYS.reduce((sum, d) => sum + values.minutes[d], 0);
  const max = Math.max(...DAYS.map((d) => values.minutes[d]));
  const current = Number(values.current) || 0;
  const goal = Number(values.goal) || 0;
  return {
    values,
    date,
    total,
    max,
    current,
    goal,
    gain: goal > current && current ? goal - current : null,
    drills: flow.skipped ? [] : values.drills,
  };
}
type Week = ReturnType<typeof readWeek>;

function RevealButton({ flow, className }: { flow: Flow; className?: string }) {
  return <Button className={cx("w-full", className)} onClick={flow.admin ? () => flow.cases.leave("thisweek") : flow.toPlan}>{flow.admin ? "Go to This week" : "Choose your plan"}</Button>;
}

function Heading({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <div className={cx("reveal-in flex flex-col gap-2", className)} style={style}>
      <h1 className="text-h3 font-semibold text-ink">Your first week is ready</h1>
      <p className="text-body text-smoke">Here is the week DrillMap made for you.</p>
    </div>
  );
}

function ColumnsReveal({ flow, children }: { flow: Flow; children: ReactNode }) {
  return <Columns main={<div className="flex flex-col gap-8">{children}</div>} actions={<RevealButton flow={flow} />} aside={<RoadToTest flow={flow} />} />;
}

function DrillRows({ week, className }: { week: Week; className?: string }) {
  return (
    <ul className={cx("flex flex-col gap-2", className)}>
      {week.drills.map((d) => (
        <li key={d.label} className="flex min-h-11 items-center gap-4 rounded-sm border border-vellum-line bg-paper px-3 py-2">
          <span className="w-[52px] shrink-0 font-mono text-caption text-smoke">{d.minutes} min</span>
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-small font-medium text-ink">{d.label}</span>
            <span className="text-caption text-accent">{d.why}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function NoDrills({ className }: { className?: string }) {
  return <p className={cx("rounded-sm border border-dashed border-vellum-line px-4 py-3 text-small text-smoke", className)}>{NO_DRILLS}</p>;
}

/* Refined existing: today's This week pieces (score header, day tiles, drill rows) in the onboarding frame. */
export function WeekReveal({ flow }: { flow: Flow }) {
  const week = readWeek(flow);
  const { values } = week;
  return (
    <ColumnsReveal flow={flow}>
      <Heading style={rise(0)} />
      <div className="reveal-in flex flex-col gap-2" style={rise(1)}>
        <p className="text-small text-smoke">{week.date ? `${values.testDate} LSAT · ${week.date.weeks} weeks away` : "Your goal"}</p>
        <p className="flex flex-wrap items-baseline gap-x-3.5">
          <span className="text-[40px] font-semibold leading-[44px] tracking-display text-ink tabular-nums">{values.current || "—"} → {values.goal || "—"}</span>
          {week.gain && <span className="text-body font-medium text-accent">+{week.gain} to go</span>}
        </p>
      </div>
      <div className="reveal-in flex flex-col gap-3" style={rise(2)}>
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-body font-semibold text-ink">Your week</span>
          <span className="text-small text-smoke">{hours(week.total)}{values.ptDay ? ` · practice test ${DAY_NAMES[values.ptDay]}` : ""}</span>
        </p>
        <ol className="grid grid-cols-7 gap-1 sm:gap-2">
          {DAYS.map((d, i) => {
            const pt = values.ptDay === d;
            return (
              <li key={d} className={cx("flex h-[150px] min-w-0 flex-col gap-1.5 rounded-sm border bg-paper p-1 pb-1.5 sm:p-1.5", pt ? "border-accent" : d === "Mon" ? "border-ink" : "border-vellum-line")}>
                <span className={cx("px-0.5 text-caption", pt ? "font-medium text-accent" : d === "Mon" ? "font-medium text-ink" : "text-smoke")}>{d}</span>
                <span className="flex flex-1 items-end">
                  <span
                    className={cx("reveal-grow flex w-full items-end justify-center rounded-xs", pt ? "bg-ink pb-1 text-caption font-medium leading-none text-chalk" : "bg-accent/14")}
                    style={{ height: Math.max(6, Math.round((values.minutes[d] / week.max) * 80)), ...grow(i, DAYS.length) }}
                  >
                    {pt && "PT"}
                  </span>
                </span>
                <span className="-mx-0.5 whitespace-nowrap text-center text-caption font-medium tracking-heading text-ink tabular-nums">
                  <span className="sm:hidden">{shortHours(values.minutes[d])}</span>
                  <span className="max-sm:hidden">{hours(values.minutes[d])}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="reveal-in flex flex-col gap-3" style={rise(3)}>
        <p className="text-body font-semibold text-ink">Monday&apos;s drills</p>
        {week.drills.length ? <DrillRows week={week} /> : <NoDrills />}
      </div>
    </ColumnsReveal>
  );
}
