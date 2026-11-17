import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { cx } from "@/components/ui/classes";
import { adminScheduleStateMessage, type ReadOnlyCurrentWeekResult } from "@/lib/readOnlyCurrentWeekSchedule";
import {
  activitiesDueBefore, doneActivityIds, formatScheduleWeekOf, scheduledActivityCount, weekNotes, weekPace,
} from "@/lib/scheduleCheckInSummary";
import type { ActivityCheckIn, WeeklySchedule } from "@/lib/types";

export const DETAIL_CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";

function WeekSummary({ schedule, checkIns, today }: { schedule: WeeklySchedule; checkIns: ActivityCheckIn[]; today: string }) {
  const total = scheduledActivityCount(schedule);
  const done = doneActivityIds(checkIns).size;
  const pace = weekPace({ done, total, dueBeforeToday: activitiesDueBefore(schedule, today) });
  const notes = weekNotes(schedule);
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-h4 font-semibold text-ink">Week of {formatScheduleWeekOf(schedule.weekOf)}</h2>
        <p className="text-small text-smoke">
          <span className="font-medium text-ink tabular-nums">{done} of {total}</span> done · <span className={pace.behind ? "font-medium text-warning-ink" : undefined}>{pace.label}</span>
        </p>
      </div>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {notes.map((note) => <li key={note} className="flex gap-2 text-small text-smoke"><span aria-hidden className="mt-2 size-1 shrink-0 rounded-pill bg-fog" />{note}</li>)}
        </ul>
      )}
    </div>
  );
}

export function ThisWeekPanel({ week, today }: { week: ReadOnlyCurrentWeekResult; today: string }) {
  if (week.kind !== "schedule") {
    return (
      <div className={cx(DETAIL_CARD, "flex flex-col gap-1 p-5")}>
        <p className="text-small font-medium text-ink">No schedule this week</p>
        <p className="max-w-prose text-small text-smoke">{adminScheduleStateMessage(week)}</p>
      </div>
    );
  }
  return (
    <ScheduleCheckInView
      scheduleId={week.schedule.id}
      schedule={week.schedule.schedule}
      student={week.schedule.generationInputs.student}
      checkIns={week.checkIns}
      readOnly
      today={today}
      header={<WeekSummary schedule={week.schedule.schedule} checkIns={week.checkIns} today={today} />}
      padding="pt-5"
    />
  );
}
