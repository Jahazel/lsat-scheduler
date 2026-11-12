"use client";

import { useState } from "react";
import { FOCUS, cx } from "@/components/ui/classes";
import { DAYS, DAY_NAMES, PT_NEEDS, hours, weekProblem, type Day, type Flow } from "./flow";

const MIN = 30;
const MAX = 480;
const STEP = 15;
const clamp = (m: number) => Math.min(MAX, Math.max(MIN, m));
const total = (flow: Flow) => DAYS.reduce((sum, d) => sum + flow.values.minutes[d], 0);
const setDay = (flow: Flow, day: Day, minutes: number) => flow.edit({ minutes: { ...flow.values.minutes, [day]: clamp(minutes) } });

const STEP_BUTTON = cx(
  "grid size-11 shrink-0 place-items-center rounded-sm text-body text-ink transition-colors duration-(--duration-fast) ease-out hover:bg-vellum active:bg-vellum-line disabled:text-fog disabled:hover:bg-transparent",
  FOCUS,
);

function PtStatus({ flow }: { flow: Flow }) {
  const problem = weekProblem(flow.values);
  const { ptDay, testTime, minutes } = flow.values;
  if (problem) return <p className="text-small text-danger-ink">{problem}</p>;
  return (
    <p className="text-small text-smoke">
      <span className="font-medium text-ink">{DAY_NAMES[ptDay!]}</span> has {hours(minutes[ptDay!])}. A full practice test takes {hours(PT_NEEDS[testTime])}
      {testTime === "standard" ? " with standard time" : ` with ${testTime}× time`}.
    </p>
  );
}

function Total({ flow }: { flow: Flow }) {
  return (
    <div className="flex items-baseline justify-between pt-1 text-small">
      <span className="text-smoke">Weekly total</span>
      <span className="font-semibold tabular-nums text-ink">{hours(total(flow))}</span>
    </div>
  );
}


const TIME_OPTIONS = Array.from({ length: (MAX - MIN) / STEP + 1 }, (_, i) => MIN + i * STEP);
function PickStepper({ label, minutes, onChange }: { label: string; minutes: number; onChange: (m: number) => void }) {
  return (
    <div role="group" aria-label={label} className="flex h-11 items-center rounded-sm border border-vellum-line bg-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
      <button type="button" aria-label={`15 min less, ${label}`} disabled={minutes <= MIN} onClick={() => onChange(clamp(minutes - STEP))} className={cx(STEP_BUTTON, "focus-visible:outline-none")}>−</button>
      <select
        aria-label={label}
        value={minutes}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-center text-body font-medium tabular-nums text-ink outline-none [text-align-last:center] hover:bg-vellum/60"
      >
        {TIME_OPTIONS.map((m) => <option key={m} value={m}>{hours(m)}</option>)}
      </select>
      <button type="button" aria-label={`15 min more, ${label}`} disabled={minutes >= MAX} onClick={() => onChange(clamp(minutes + STEP))} className={cx(STEP_BUTTON, "focus-visible:outline-none")}>+</button>
    </div>
  );
}

export function WeekStepperTable({ flow }: { flow: Flow }) {
  const { values, edit } = flow;
  const [all, setAll] = useState(90);
  const problem = weekProblem(values);
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Practice-test day" className="flex flex-col">
        <div className="grid grid-cols-[36px_minmax(0,1fr)_60px] gap-2 sm:grid-cols-[44px_minmax(0,1fr)_72px] sm:gap-3 pb-2 text-caption text-smoke">
          <span>Day</span><span>Study time</span><span className="text-center">Practice test</span>
        </div>
        <div className="-mx-2 grid grid-cols-[36px_minmax(0,1fr)_60px] items-center gap-2 sm:grid-cols-[44px_minmax(0,1fr)_72px] sm:gap-3 rounded-sm bg-vellum px-2 py-2">
          <span className="text-small font-medium text-ink">All</span>
          <PickStepper label="Study time for all days" minutes={all} onChange={setAll} />
          <button
            type="button"
            onClick={() => edit({ minutes: Object.fromEntries(DAYS.map((d) => [d, all])) as typeof values.minutes })}
            className={cx("h-11 rounded-sm border border-vellum-line bg-paper text-small font-medium text-ink hover:bg-vellum-line/40", FOCUS)}
          >
            Apply
          </button>
        </div>
        {DAYS.map((d) => {
          const pt = values.ptDay === d;
          return (
            <div key={d} className={cx("-mx-2 flex flex-col gap-1 border-b border-vellum-line px-2 py-2 transition-colors duration-(--duration-fast) ease-out", pt && "bg-accent/faint")}>
              <div className="grid grid-cols-[36px_minmax(0,1fr)_60px] items-center gap-2 sm:grid-cols-[44px_minmax(0,1fr)_72px] sm:gap-3">
                <span className={cx("text-small font-medium", pt ? "text-accent" : "text-ink")}>{d}</span>
                <PickStepper label={`${DAY_NAMES[d]} study time`} minutes={values.minutes[d]} onChange={(m) => setDay(flow, d, m)} />
                <label className="grid h-11 cursor-pointer place-items-center">
                  <input type="radio" name="pt-day-stepper-table" aria-label={`Practice test on ${DAY_NAMES[d]}`} checked={pt} onChange={() => edit({ ptDay: d })} className="size-5 accent-accent" />
                </label>
              </div>
              {pt && problem && <p className="pl-11 text-caption text-danger-ink sm:pl-[56px]">{problem}</p>}
            </div>
          );
        })}
      </div>
      <Total flow={flow} />
      {problem && !values.ptDay ? <p className="text-small text-smoke">{problem}</p> : !problem && <PtStatus flow={flow} />}
    </div>
  );
}
