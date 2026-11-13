"use client";

import { useRef, useState, type ReactNode, type Ref } from "react";
import { Button } from "@/components/ui/Button";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { cx } from "@/components/ui/classes";
import { roundMinutesToTotal, shortDuration } from "@/lib/formatDuration";

export type TodayActivity = { id: string; label: string; minutes: number; section: string | null };
export type NextStudyDay = { day: string; date: string; activities: number; minutes: number };

interface TodayCardProps {
  day: string;
  date: string;
  activities: TodayActivity[];
  notes: string[];
  emptyText: string;
  next: NextStudyDay | null;
  doneIds: ReadonlySet<string>;
  onToggle: (activityId: string) => void;
  setUp: (activityId: string, look: "outline" | "quiet") => ReactNode;
  rowRef: (activityId: string) => Ref<HTMLButtonElement>;
}

const TICK = "transition-colors duration-(--duration-fast) ease-out";
const PRESS = "transition-transform duration-(--duration-fast) ease-(--ease-out-strong) group-active:scale-95 motion-reduce:group-active:scale-100";
const activityCount = (count: number) => `${count} ${count === 1 ? "activity" : "activities"}`;

export function ActivityLabel({ label }: { label: string }) {
  const match = /^(.*?)(\S+ \(L[^)]*\))$/.exec(label);
  if (!match) return label;
  return <>{match[1]}<span className="whitespace-nowrap">{match[2]}</span></>;
}

export function TickMark({ done }: { done: boolean }) {
  return (
    <span className={cx("flex shrink-0 rounded-pill outline-offset-2 group-focus-visible:outline-2 group-focus-visible:outline-accent", PRESS)}>
      <StatusIcon name={done ? "check-disc" : "open-circle"}
        className={cx("size-5", TICK, !done && "pointer-hover:group-hover:text-ink group-focus-visible:text-ink")} />
    </span>
  );
}

function NextLine({ next }: { next: NextStudyDay | null }) {
  if (!next) return <p className="text-small text-smoke">Nothing else is planned this week.</p>;
  return (
    <p className="text-small text-smoke">
      Next: <span className="text-ink">{next.day}, {next.date}</span> · <span className="whitespace-nowrap">{activityCount(next.activities)}, {shortDuration(next.minutes)}</span>
    </p>
  );
}

export function TodayCard({ day, date, activities, notes, emptyText, next, doneIds, onToggle, setUp, rowRef }: TodayCardProps) {
  const rounded = roundMinutesToTotal(activities.map((activity) => activity.minutes));
  const minutes = new Map(activities.map((activity, index) => [activity.id, rounded[index]!]));
  const left = activities.filter((activity) => !doneIds.has(activity.id));
  const upNext = left[0];
  const others = activities.filter((activity) => activity !== upNext);
  const setUpColumn = others.some((activity) => activity.section !== null && !doneIds.has(activity.id));
  const leftMinutes = left.reduce((total, activity) => total + minutes.get(activity.id)!, 0);
  const focusAllDone = useRef(false);
  const shown = upNext?.id ?? "all done";
  const [firstShown] = useState(shown);
  const [changed, setChanged] = useState(false);
  if (!changed && shown !== firstShown) setChanged(true);
  const swap = changed && "up-next-swap";

  return (
    <section aria-labelledby="today-title" className="flex flex-col gap-4 rounded-lg border border-vellum-line bg-paper p-4 shadow-control md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="today-title" className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-h5 font-semibold text-ink">Today</span>
          <span className="text-small text-smoke">{day}, {date}</span>
        </h2>
        {activities.length > 0 && (
          <span className="text-small text-smoke tabular-nums">
            {activities.length - left.length} of {activities.length} done{left.length > 0 && ` · ${shortDuration(leftMinutes)} left`}
          </span>
        )}
      </div>
      {notes.length > 0 && <div className="-mt-2 flex flex-col gap-1">{notes.map((note) => <p key={note} className="text-small text-smoke">{note}</p>)}</div>}
      {activities.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-md bg-vellum px-4 py-5 md:px-5">
          <p className="text-body text-ink">{emptyText}</p>
          <NextLine next={next} />
        </div>
      ) : upNext ? (
        <div className="flex flex-col gap-4 rounded-md bg-vellum p-4 md:flex-row md:items-center md:justify-between md:gap-6 md:p-5">
          <div aria-live="polite" className="min-w-0">
            <div key={upNext.id} className={cx("flex flex-col gap-1", swap)}>
              <p className="text-caption text-smoke">Up next</p>
              <p className="text-h5 font-medium text-pretty text-ink"><ActivityLabel label={upNext.label} /></p>
              <p className="text-small text-smoke">{shortDuration(minutes.get(upNext.id)!)}{upNext.section && ` · ${upNext.section}`}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 *:flex-1 md:*:flex-none">
            {upNext.section !== null && setUp(upNext.id, "outline")}
            <Button size="md" aria-label={`Mark done: ${upNext.label}`} onClick={() => {
              focusAllDone.current = left.length === 1;
              onToggle(upNext.id);
            }}>Mark done</Button>
          </div>
        </div>
      ) : (
        <div tabIndex={-1} aria-live="polite" ref={(panel) => {
          if (!panel || !focusAllDone.current) return;
          focusAllDone.current = false;
          panel.focus();
        }} className={cx("flex flex-col gap-1 rounded-md bg-vellum px-4 py-5 outline-none md:px-5", swap)}>
          <p className="flex items-center gap-2 text-h5 font-medium text-ink"><StatusIcon name="check-disc" className="size-5" />All done for today</p>
          <div className="pl-7"><NextLine next={next} /></div>
        </div>
      )}
      {others.length > 0 && (
        <ul className="flex flex-col">
          {others.map((activity) => {
            const done = doneIds.has(activity.id);
            return (
              <li key={activity.id} className="flex items-center gap-1">
                <button ref={rowRef(activity.id)} type="button" role="checkbox" aria-checked={done} onClick={() => onToggle(activity.id)}
                  className={cx("group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left pointer-hover:hover:bg-vellum focus-visible:outline-none", TICK)}>
                  <TickMark done={done} />
                  <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-3">
                    <span className={cx("min-w-0 flex-1 text-small", TICK, done ? "text-smoke line-through decoration-fog" : "text-ink")}>
                      <ActivityLabel label={activity.label} />
                    </span>
                    <span className="shrink-0 text-caption text-smoke tabular-nums md:text-small">{shortDuration(minutes.get(activity.id)!)}</span>
                  </span>
                </button>
                {setUpColumn && (
                  <span className="flex w-[72px] shrink-0 justify-end">{activity.section !== null && !done && setUp(activity.id, "quiet")}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
