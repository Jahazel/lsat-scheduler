import { formatScheduleWeekOf } from "@/lib/scheduleCheckInSummary";
import { STREAK_THRESHOLD_PERCENT, summarizeHistoryStats, type ScheduleHistoryWeek } from "@/lib/scheduleHistorySummary";
import type { ReactNode } from "react";

export interface ScheduleHistoryRailWeek extends ScheduleHistoryWeek {
  href: string;
  isSelected: boolean;
}

function hours(minutes: number) {
  return `${Math.round((minutes / 60) * 10) / 10} h`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function CurrentPill() {
  return <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium leading-[1.4] text-ink-500">This week</span>;
}

function HistoryStats({ weeks }: { weeks: ScheduleHistoryRailWeek[] }) {
  const stats = summarizeHistoryStats(weeks);
  const metrics = [
    {
      label: "Avg. done",
      value: stats.averageDonePercent === null ? "—" : `${stats.averageDonePercent}%`,
      note: stats.pastWeekCount === 0 ? "after your first week" : `past ${stats.pastWeekCount} ${pluralize(stats.pastWeekCount, "week")}`,
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
    <dl className="grid grid-cols-2 gap-2">
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

function WeekRailList({ weeks }: { weeks: ScheduleHistoryRailWeek[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {weeks.map((week) => (
        <li key={week.weekStartDate}>
          <a
            aria-current={week.isSelected ? "page" : undefined}
            className={`block rounded-lg border bg-white px-3 py-3 transition-colors duration-150 ease-out ${week.isSelected ? "border-accent-600 bg-accent-100/40" : "border-ink-100 hover:border-ink-400"}`}
            href={week.href}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={`text-sm ${week.isSelected ? "font-semibold text-ink-900" : "font-medium text-ink-700"}`}>{formatScheduleWeekOf(week.weekStartDate)}</span>
              {week.isCurrent && <CurrentPill />}
            </span>
            <span aria-hidden className="mt-2 block h-1 overflow-hidden rounded-full bg-ink-100">
              <span className="block h-full rounded-full bg-accent-600" style={{ width: `${week.completionPercent}%` }} />
            </span>
            <span className="mt-1 block text-xs text-ink-400">{week.done} of {week.total} done · {hours(week.plannedMinutes)} planned</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function HistoryContent({ weeks, showSectionHeadings }: { weeks: ScheduleHistoryRailWeek[]; showSectionHeadings: boolean }) {
  return (
    <>
      {showSectionHeadings && <p className="px-1 text-xs font-medium uppercase leading-[1.4] tracking-wider text-ink-400">How it&apos;s going</p>}
      <div className={showSectionHeadings ? "mt-3" : ""}><HistoryStats weeks={weeks} /></div>
      {showSectionHeadings && <p className="mt-7 px-1 text-xs font-medium uppercase leading-[1.4] tracking-wider text-ink-400">Your weeks</p>}
      <div className={showSectionHeadings ? "mt-3" : "mt-3 border-t border-ink-100 pt-3"}><WeekRailList weeks={weeks} /></div>
    </>
  );
}

export default function ScheduleHistoryRail({ weeks, children }: { weeks: ScheduleHistoryRailWeek[]; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
      <div className="min-w-0">
        <details className="mb-6 overflow-hidden rounded-lg border border-ink-200 bg-white lg:hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink-900">Your weeks ({weeks.length})</summary>
          <div className="border-t border-ink-100 px-3 py-3"><HistoryContent showSectionHeadings={false} weeks={weeks} /></div>
        </details>
        {children}
      </div>
      <aside aria-label="Your weeks" className="hidden lg:block">
        <div className="sticky top-28">
          <HistoryContent showSectionHeadings weeks={weeks} />
        </div>
      </aside>
    </div>
  );
}
