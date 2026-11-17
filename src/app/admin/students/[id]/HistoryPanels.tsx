import Link from "next/link";
import type { ReactNode } from "react";
import { FOCUS_INSET, cx } from "@/components/ui/classes";
import type { PastWeekMonth } from "@/lib/progressHistory";
import { DETAIL_CARD } from "./ThisWeekPanel";

export const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

export const ROW = cx("w-full px-4 text-left transition-colors duration-(--duration-fast) ease-out pointer-hover:hover:bg-vellum sm:px-5", FOCUS_INSET);

export function PanelHeader({ title, aside, children }: { title: string; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-h4 font-semibold text-ink">{title}</h2>
        {aside && <p className="text-small text-smoke">{aside}</p>}
      </div>
      {children}
    </div>
  );
}

export function MonthCard({ title, count, children }: { title: string; count: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={cx(DETAIL_CARD, "overflow-hidden")}>
      <div className="flex items-baseline justify-between gap-4 px-4 py-4 sm:px-5">
        <h3 className="text-small font-medium text-ink">{title}</h3>
        <span className="text-caption text-smoke">{count}</span>
      </div>
      <ul>{children}</ul>
    </section>
  );
}

export function Chevron({ open }: { open?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={cx("size-4 text-smoke transition-transform duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:transition-none", open && "rotate-90")}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

export function NoPastWeeks() {
  return (
    <div className={cx(DETAIL_CARD, "flex flex-col gap-1 px-5 py-8 sm:px-6")}>
      <p className="text-small font-medium text-ink">No past weeks yet.</p>
      <p className="text-small text-smoke">Each week shows up here after it ends.</p>
    </div>
  );
}

export function PastWeeksPanel({ months, weekPrefix }: { months: PastWeekMonth[]; weekPrefix: string }) {
  const weeks = months.flatMap((month) => month.weeks);
  if (weeks.length === 0) return <div className="flex flex-col gap-5"><PanelHeader title="Past weeks" /><NoPastWeeks /></div>;
  const done = weeks.reduce((sum, week) => sum + week.done, 0);
  const total = weeks.reduce((sum, week) => sum + week.total, 0);
  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title="Past weeks" aside={<><span className="font-medium text-ink tabular-nums">{done} of {total}</span> done · {plural(weeks.length, "week")}</>} />
      {months.map(({ month, weeks: monthWeeks }) => (
        <MonthCard key={month} title={month} count={plural(monthWeeks.length, "week")}>
          {monthWeeks.map((week) => (
            <li key={week.weekStartDate} className="border-t border-vellum-line">
              <Link href={`${weekPrefix}${week.weekStartDate}`}
                className={cx(ROW, "grid min-h-14 grid-cols-[1fr_auto_16px] items-center gap-x-3 gap-y-2 py-3 [grid-template-areas:'dates_count_chevron'_'bar_bar_chevron'] sm:grid-cols-[150px_minmax(0,240px)_1fr_16px] sm:gap-4 sm:py-0 sm:[grid-template-areas:'dates_bar_count_chevron']")}>
                <span className="text-small text-ink [grid-area:dates]">{week.label}</span>
                <span aria-hidden className="h-1 overflow-hidden rounded-pill bg-vellum-line [grid-area:bar]">
                  <span className="block h-full rounded-pill bg-accent" style={{ width: `${week.completionPercent}%` }} />
                </span>
                <span className="justify-self-end text-caption text-smoke tabular-nums [grid-area:count]">{week.done} of {week.total} done</span>
                <span className="justify-self-end [grid-area:chevron]"><Chevron /></span>
              </Link>
            </li>
          ))}
        </MonthCard>
      ))}
    </div>
  );
}
