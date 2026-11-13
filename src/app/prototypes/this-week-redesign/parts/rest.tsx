"use client";

import { useId, type ComponentType } from "react";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { cx } from "@/components/ui/classes";
import { roundMinutesToTotal } from "@/lib/formatDuration";
import { DAY_KEYS, DAY_NAMES, KIND_LABEL, duration, type Activity, type Day, type Week } from "./data";
import { ActivityLabel, Mark, SetUpText, TICK, type TodayProps } from "./today";

export type RestProps = {
  week: Week;
  today: Day | null;
  done: Set<string>;
  toggle: (id: string) => void;
  preview: boolean;
} & Pick<TodayProps, "onSetUp" | "openId">;

const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";

function plan(day: Day, done: Set<string>, today: Day | null) {
  const rounded = roundMinutesToTotal(day.activities.map((x) => x.minutes));
  const minutes = new Map(day.activities.map((x, i) => [x.id, rounded[i]!]));
  const total = rounded.reduce((sum, m) => sum + m, 0);
  const doneCount = day.activities.filter((x) => done.has(x.id)).length;
  const past = today !== null && DAY_KEYS.indexOf(day.key) < DAY_KEYS.indexOf(today.key);
  const allDone = day.activities.length > 0 && doneCount === day.activities.length;
  return { minutes, total, doneCount, past, allDone, empty: day.activities.length === 0 };
}
type Plan = ReturnType<typeof plan>;

const emptyText = (day: Day) => day.reason ?? (day.kind === "rest" ? "Rest day. Nothing planned." : "Not scheduled.");
// Same words as the live dayKind: a week with two practice tests numbers them.
function kindLabel(week: Week, day: Day) {
  const tests = week.days.filter((d) => d.kind === "practice");
  return day.kind === "practice" && tests.length > 1 ? `Practice test ${tests.indexOf(day) + 1} of ${tests.length}` : KIND_LABEL[day.kind];
}
const meta = (week: Week, day: Day, p: Plan) => `${kindLabel(week, day)} · ${duration(p.total)} of ${duration(day.capacity)}`;

function DayNotes({ day }: { day: Day }) {
  return day.notes?.map((note) => <p key={note} className="text-small text-smoke">{note}</p>);
}

function Status({ p, count }: { p: Plan; count: number }) {
  if (p.allDone) return <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-small text-ink"><StatusIcon name="check-circle" />All done</span>;
  if (p.past || p.doneCount > 0) return <span className="shrink-0 whitespace-nowrap text-small text-smoke tabular-nums">{p.doneCount} of {count} done</span>;
  return null;
}

/* The same check-in row as Today's list: tick circle, label, rounded minutes, and a quiet Set up on not-done drills. */
function Rows({ day, p, done, toggle, preview, onSetUp, openId }: { day: Day; p: Plan } & Omit<RestProps, "week" | "today">) {
  const setUpSlot = day.activities.some((x) => x.guide && !done.has(x.id));
  return (
    <ul className="flex flex-col">
      {day.activities.map((x: Activity) => {
        const isDone = done.has(x.id);
        const text = (
          <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-3">
            <span className={cx("min-w-0 flex-1 text-small", TICK, isDone ? "text-smoke line-through decoration-fog" : "text-ink")}><ActivityLabel label={x.label} /></span>
            <span className="shrink-0 text-caption text-smoke tabular-nums md:text-small">{duration(p.minutes.get(x.id)!)}</span>
          </span>
        );
        const row = "flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left";
        return (
          <li key={x.id} className="flex items-center gap-1">
            {preview ? (
              <span className={row}><Mark done={isDone} />{text}</span>
            ) : (
              <button type="button" role="checkbox" aria-checked={isDone} onClick={() => toggle(x.id)}
                className={cx("group pointer-hover:hover:bg-vellum focus-visible:outline-none", row, TICK)}>
                <Mark done={isDone} />{text}
              </button>
            )}
            {setUpSlot && <span className="flex w-[72px] shrink-0 justify-end">{x.guide && !isDone && <SetUpText activity={x} day={day} onSetUp={onSetUp} openId={openId} where={DAY_NAMES[day.key]} />}</span>}
          </li>
        );
      })}
    </ul>
  );
}

const others = ({ week, today }: RestProps) => week.days.filter((d) => d !== today);
// On the last day of the week every other day is behind the student, so "Rest of the week" would be wrong.
function Heading({ preview, id, week, today }: { preview: boolean; id: string; week: Week; today: Day | null }) {
  const later = today !== null && week.days.indexOf(today) < week.days.length - 1;
  const text = preview ? "Days" : later ? "Rest of the week" : "Earlier this week";
  return <h2 id={id} className={cx("px-1 text-small font-medium text-smoke", preview && "sr-only")}>{text}</h2>;
}

/* Section 4 pick (2026-11-12), Day cards: the live list, refined. One white card per day in date order; empty days shrink to one line. */
export function DayCards(props: RestProps) {
  const { done } = props;
  const id = useId();
  return (
    <section aria-labelledby={id} data-rest className="flex flex-col gap-3">
      <Heading preview={props.preview} id={id} week={props.week} today={props.today} />
      {others(props).map((d) => {
        const p = plan(d, done, props.today);
        if (p.empty) {
          return (
            <section key={d.key} aria-label={DAY_NAMES[d.key]} className={cx(CARD, "flex flex-col gap-y-0.5 px-6 py-3.5 md:px-8")}>
              <div className="flex flex-col gap-x-4 gap-y-0.5 md:flex-row md:items-baseline">
                <h3 className="flex shrink-0 items-baseline gap-2 text-small font-medium text-ink">{DAY_NAMES[d.key]} <span className="font-regular text-smoke">{d.date}</span></h3>
                <p className="text-small text-smoke">{emptyText(d)}</p>
              </div>
              <DayNotes day={d} />
            </section>
          );
        }
        return (
          <section key={d.key} aria-label={DAY_NAMES[d.key]} className={cx(CARD, "flex flex-col gap-2 p-4 md:p-6")}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
              <h3 className="flex items-baseline gap-2 text-h6 font-medium text-ink">{DAY_NAMES[d.key]} <span className="text-small font-regular text-smoke">{d.date}</span></h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-small text-smoke tabular-nums">{meta(props.week, d, p)}</span>
                <Status p={p} count={d.activities.length} />
              </div>
            </div>
            {d.notes && <div className="flex flex-col gap-1 px-2"><DayNotes day={d} /></div>}
            <Rows day={d} p={p} {...props} />
          </section>
        );
      })}
    </section>
  );
}

export const REST_VARIANTS: { name: string; Rest: ComponentType<RestProps> }[] = [
  { name: "Day cards", Rest: DayCards },
];
