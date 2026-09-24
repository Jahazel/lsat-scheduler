import Link from "next/link";
import { formatScheduleWeekOf } from "@/lib/scheduleCheckInSummary";
import { STREAK_THRESHOLD_PERCENT, summarizeHistoryStats, type ScheduleHistoryWeek } from "@/lib/scheduleHistorySummary";

function hours(minutes: number) {
  return `${Math.round((minutes / 60) * 10) / 10} h`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function HistoryStats({ weeks }: { weeks: ScheduleHistoryWeek[] }) {
  const stats = summarizeHistoryStats(weeks);
  const metrics = [
    {
      label: "Avg. done",
      value: stats.averageDonePercent === null ? "—" : `${stats.averageDonePercent}%`,
      note: `past ${stats.pastWeekCount} ${pluralize(stats.pastWeekCount, "week")}`,
    },
    { label: "Streak", value: stats.streakWeeks === null ? "—" : `${stats.streakWeeks} wk`, note: `in a row at ${STREAK_THRESHOLD_PERCENT}%+` },
    { label: "Planned", value: hours(stats.plannedMinutes), note: `across ${weeks.length} ${pluralize(weeks.length, "week")}` },
    {
      label: "Best week",
      value: stats.bestWeek ? `${stats.bestWeek.completionPercent}%` : "—",
      note: stats.bestWeek ? formatScheduleWeekOf(stats.bestWeek.weekStartDate) : "—",
    },
  ];

  return (
    <dl className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
      {metrics.map((metric) => (
        <div className="rounded-lg border border-ink-100 bg-white px-3 py-2.5" key={metric.label}>
          <dd className="text-lg font-semibold tabular-nums text-ink-900">{metric.value}</dd>
          <dt className="mt-1 text-xs font-medium leading-[1.4] text-ink-500">{metric.label}</dt>
          <dd className="mt-0.5 text-xs font-medium leading-[1.4] text-ink-500">{metric.note}</dd>
        </div>
      ))}
    </dl>
  );
}

// `weeks` holds every saved week, including the current one, so the stats match
// the history the student has built. Only finished weeks are listed to open.
export default function ProgressOverview({ weeks }: { weeks: ScheduleHistoryWeek[] }) {
  const pastWeeks = weeks
    .filter((week) => !week.isCurrent)
    .toSorted((first, second) => second.weekStartDate.localeCompare(first.weekStartDate));

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Progress</h1>
      {pastWeeks.length === 0 ? (
        <p className="mt-3 max-w-md text-sm text-ink-700">
          No finished weeks yet. After your first week, your average, streak, planned hours and past plans show up here.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-500">How your weeks have gone so far.</p>
          <HistoryStats weeks={weeks} />
          <h2 className="mt-8 text-sm font-semibold text-ink-900">Your weeks</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {pastWeeks.map((week) => (
              <li key={week.weekStartDate}>
                <Link
                  href={`/progress?week=${week.weekStartDate}`}
                  className="block rounded-lg border border-ink-100 bg-white px-3 py-3 transition-colors duration-150 ease-out hover:border-ink-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                >
                  <span className="text-sm font-medium text-ink-700">{formatScheduleWeekOf(week.weekStartDate)}</span>
                  <span aria-hidden className="mt-2 block h-1 overflow-hidden rounded-full bg-ink-100">
                    <span className="block h-full rounded-full bg-accent-600" style={{ width: `${week.completionPercent}%` }} />
                  </span>
                  <span className="mt-1 block text-xs text-ink-500">
                    {week.done} of {week.total} done · {hours(week.plannedMinutes)} planned
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
