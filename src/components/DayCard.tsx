import type { ReactNode, Ref } from "react";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { cx } from "@/components/ui/classes";
import { roundMinutesToTotal, shortDuration } from "@/lib/formatDuration";
import { ActivityRows, type TodayActivity } from "@/components/TodayCard";

interface DayCardProps {
  day: string;
  date: string;
  kind: string;
  capacityMinutes: number;
  activities: TodayActivity[];
  notes: string[];
  emptyText: string;
  past: boolean;
  doneIds: ReadonlySet<string>;
  onToggle?: (activityId: string) => void;
  setUp: (activityId: string) => ReactNode;
  rowRef: (activityId: string) => Ref<HTMLButtonElement>;
}

const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";

function Notes({ notes }: { notes: string[] }) {
  return notes.map((note) => <p key={note} className="text-small text-smoke">{note}</p>);
}

export function DayCard({ day, date, kind, capacityMinutes, activities, notes, emptyText, past, doneIds, onToggle, setUp, rowRef }: DayCardProps) {
  if (activities.length === 0) {
    return (
      <section aria-label={day} className={cx(CARD, "flex flex-col gap-y-0.5 px-6 py-3.5 md:px-8")}>
        <div className="flex flex-col gap-x-4 gap-y-0.5 md:flex-row md:items-baseline">
          <h3 className="flex shrink-0 items-baseline gap-2 text-small font-medium text-ink">{day} <span className="font-regular text-smoke">{date}</span></h3>
          <p className="text-small text-smoke">{emptyText}</p>
        </div>
        <Notes notes={notes} />
      </section>
    );
  }
  const rounded = roundMinutesToTotal(activities.map((activity) => activity.minutes));
  const minutes = new Map(activities.map((activity, index) => [activity.id, rounded[index]!]));
  const total = rounded.reduce((sum, part) => sum + part, 0);
  const doneCount = activities.filter((activity) => doneIds.has(activity.id)).length;
  return (
    <section aria-label={day} className={cx(CARD, "flex flex-col gap-2 p-4 md:p-6")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
        <h3 className="flex items-baseline gap-2 text-h6 font-medium text-ink">{day} <span className="text-small font-regular text-smoke">{date}</span></h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-small text-smoke tabular-nums">{kind} · {shortDuration(total)} of {shortDuration(capacityMinutes)}</span>
          {doneCount === activities.length ? (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-small text-ink"><StatusIcon name="check-circle" />All done</span>
          ) : (past || doneCount > 0) && (
            <span className="shrink-0 whitespace-nowrap text-small text-smoke tabular-nums">{doneCount} of {activities.length} done</span>
          )}
        </div>
      </div>
      {notes.length > 0 && <div className="flex flex-col gap-1 px-2"><Notes notes={notes} /></div>}
      <ActivityRows activities={activities} minutes={minutes} doneIds={doneIds} onToggle={onToggle} setUp={setUp} rowRef={rowRef} />
    </section>
  );
}
