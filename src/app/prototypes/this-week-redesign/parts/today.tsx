"use client";

import type { ComponentType } from "react";
import { Button } from "@/components/ui/Button";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { FOCUS, cx } from "@/components/ui/classes";
import { roundMinutesToTotal } from "@/lib/formatDuration";
import { DAY_KEYS, DAY_NAMES, duration, type Activity, type Day, type Week } from "./data";

export type TodayProps = {
  day: Day;
  next: Day | null;
  done: Set<string>;
  toggle: (id: string) => void;
  onSetUp: (activity: Activity, day: Day, opener: HTMLElement) => void;
  openId: string | null;
};

export function nextStudyDay(week: Week, day: Day) {
  return week.days.slice(DAY_KEYS.indexOf(day.key) + 1).find((d) => d.activities.length > 0) ?? null;
}

const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";
const minutesOf = (activities: Activity[]) => Math.round(activities.reduce((sum, x) => sum + x.minutes, 0));
const activities = (n: number) => `${n} ${n === 1 ? "activity" : "activities"}`;

// Ticking happens tens of times a day: colour only, plus a small press on the mark. No pop, no draw-in.
export const TICK = "transition-colors duration-(--duration-fast) ease-out";
const PRESS_MARK = "transition-transform duration-(--duration-fast) ease-(--ease-out-strong) group-active:scale-95 motion-reduce:group-active:scale-100";

export function Mark({ done }: { done: boolean }) {
  return (
    <span className={cx("flex shrink-0 rounded-pill outline-offset-2 group-focus-visible:outline-2 group-focus-visible:outline-accent", PRESS_MARK)}>
      <StatusIcon name={done ? "check-disc" : "open-circle"} className={cx("size-5", !done && "pointer-hover:group-hover:text-ink group-focus-visible:text-ink")} />
    </span>
  );
}

// Keeps the level range with the word before it, so "(L2-4)" never splits at its hyphen.
export function ActivityLabel({ label }: { label: string }) {
  const m = /^(.*?)(\S+ \(L[^)]*\))$/.exec(label);
  if (!m) return label;
  return <>{m[1]}<span className="whitespace-nowrap">{m[2]}</span></>;
}

export function SetUpText({ activity, day, onSetUp, openId, where }: { activity: Activity; day: Day; where?: string } & Pick<TodayProps, "onSetUp" | "openId">) {
  return (
    <button type="button" data-setup={activity.id} aria-haspopup="dialog" aria-expanded={openId === activity.id} aria-label={`Set up ${activity.label}${where ? `, ${where}` : ""}`}
      onClick={(e) => onSetUp(activity, day, e.currentTarget)}
      className={cx("h-10 shrink-0 whitespace-nowrap rounded-sm px-2.5 text-small font-medium text-smoke pointer-hover:text-ink",
        "select-none active:scale-97 motion-reduce:active:scale-100",
        "[transition:color_var(--duration-fast)_ease-out,scale_var(--duration-fast)_var(--ease-out-strong)]", FOCUS)}>
      Set up
    </button>
  );
}

function Empty({ day, next }: { day: Day; next: Day | null }) {
  return (
    <div className="flex flex-col gap-1 px-2">
      <p className="text-body text-ink">{day.reason ?? (day.kind === "rest" ? "Rest day. Nothing planned." : "Not scheduled.")}</p>
      <NextLine next={next} />
    </div>
  );
}

function NextLine({ next }: { next: Day | null }) {
  if (!next) return <p className="text-small text-smoke">Nothing else is planned this week.</p>;
  return (
    <p className="text-small text-smoke">
      Next: <span className="text-ink">{DAY_NAMES[next.key]}, {next.date}</span> · <span className="whitespace-nowrap">{activities(next.activities.length)}, {duration(minutesOf(next.activities))}</span>
    </p>
  );
}

function TodayTitle({ day }: { day: Day }) {
  return (
    <h2 className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-h5 font-semibold text-ink">Today</span>
      <span className="text-small text-smoke">{DAY_NAMES[day.key]}, {day.date}</span>
    </h2>
  );
}

/* Section 3 pick (2026-11-12), Up next: one activity at a time, with Mark done and Set up as real buttons; the day's other activities sit under it.
   Row minutes use the live rounding, so 1.5× time shows whole minutes that still add up to the day's total. */
export function UpNext({ day, next, done, toggle, onSetUp, openId }: TodayProps) {
  const rounded = roundMinutesToTotal(day.activities.map((x) => x.minutes));
  const minutes = new Map(day.activities.map((x, i) => [x.id, rounded[i]!]));
  const left = day.activities.filter((x) => !done.has(x.id));
  const focus = left[0];
  const others = day.activities.filter((x) => x !== focus);
  const othersSetUp = others.some((x) => x.guide && !done.has(x.id));
  const leftMinutes = left.reduce((sum, x) => sum + minutes.get(x.id)!, 0);
  const doneCount = day.activities.length - left.length;
  return (
    <section aria-label="Today" className={cx(CARD, "flex flex-col gap-4 p-4 md:p-6")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <TodayTitle day={day} />
        {day.activities.length > 0 && (
          <span className="text-small text-smoke tabular-nums">{doneCount} of {day.activities.length} done{left.length > 0 ? ` · ${duration(leftMinutes)} left` : ""}</span>
        )}
      </div>
      {day.notes && <div className="-mt-2 flex flex-col gap-1">{day.notes.map((note) => <p key={note} className="text-small text-smoke">{note}</p>)}</div>}
      {day.activities.length === 0 ? (
        <div className="rounded-md bg-vellum px-4 py-5 md:px-5"><Empty day={day} next={next} /></div>
      ) : focus ? (
        <div className="flex flex-col gap-4 rounded-md bg-vellum p-4 md:flex-row md:items-center md:justify-between md:gap-6 md:p-5">
          <div key={focus.id} className="today-swap flex min-w-0 flex-col gap-1" aria-live="polite">
            <p className="text-caption text-smoke">Up next</p>
            <p className="text-h5 font-medium text-pretty text-ink"><ActivityLabel label={focus.label} /></p>
            <p className="text-small text-smoke">{duration(minutes.get(focus.id)!)}{focus.guide ? ` · ${focus.guide.section}` : ""}</p>
          </div>
          <div className="flex shrink-0 gap-2 *:flex-1 md:*:flex-none">
            {focus.guide && (
              <Button variant="outline" size="md" data-setup={focus.id} aria-haspopup="dialog" aria-expanded={openId === focus.id} aria-label={`Set up ${focus.label}`}
                onClick={(e) => onSetUp(focus, day, e.currentTarget)}>Set up</Button>
            )}
            <Button size="md" aria-label={`Mark done: ${focus.label}`} onClick={() => toggle(focus.id)}>Mark done</Button>
          </div>
        </div>
      ) : (
        <div className="today-swap flex flex-col gap-1 rounded-md bg-vellum px-4 py-5 md:px-5" aria-live="polite">
          <p className="flex items-center gap-2 text-h5 font-medium text-ink"><StatusIcon name="check-disc" className="size-5" />All done for today</p>
          <div className="pl-7"><NextLine next={next} /></div>
        </div>
      )}
      {others.length > 0 && (
        <ul className="flex flex-col">
          {others.map((x) => {
            const isDone = done.has(x.id);
            return (
              <li key={x.id} className="flex items-center gap-1">
                <button type="button" role="checkbox" aria-checked={isDone} onClick={() => toggle(x.id)}
                  className={cx("group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left pointer-hover:hover:bg-vellum focus-visible:outline-none", TICK)}>
                  <Mark done={isDone} />
                  <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-3">
                    <span className={cx("min-w-0 flex-1 text-small", TICK, isDone ? "text-smoke line-through decoration-fog" : "text-ink")}><ActivityLabel label={x.label} /></span>
                    <span className="shrink-0 text-caption text-smoke tabular-nums md:text-small">{duration(minutes.get(x.id)!)}</span>
                  </span>
                </button>
                {othersSetUp && <span className="flex w-[72px] shrink-0 justify-end">{x.guide && !isDone && <SetUpText activity={x} day={day} onSetUp={onSetUp} openId={openId} />}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export const TODAY_VARIANTS: { name: string; Today: ComponentType<TodayProps> }[] = [{ name: "Up next", Today: UpNext }];
