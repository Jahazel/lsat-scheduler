import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { cx, FOCUS, FOCUS_INSET } from "@/components/ui/classes";
import type { PastWeekMonth } from "@/lib/progressHistory";

const CARD = "overflow-hidden rounded-md border border-vellum-line bg-paper";

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-smoke" aria-hidden>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

export default function ProgressOverview({ months }: { months: PastWeekMonth[] }) {
  return (
    <>
      <PageHeader title="Progress" lead="Your past weekly schedules. Open one to see what you planned and checked off." />
      <div className="flex flex-col gap-6 px-4 pt-4 pb-10 md:px-18 md:pt-12 md:pb-18">
        {months.length === 0 ? (
          <div className={cx(CARD, "flex flex-col gap-1 px-4 py-6 sm:px-6 sm:py-8")}>
            <p className="text-body font-medium text-ink">No past weeks yet.</p>
            <p className="text-small text-smoke">Each week shows up here after it ends.</p>
            <Link href="/dashboard" className={cx("mt-3 self-start rounded-xs text-small font-medium text-accent hover:underline", FOCUS)}>
              Go to This week →
            </Link>
          </div>
        ) : months.map(({ month, weeks }) => (
          <section key={month} aria-label={month} className={CARD}>
            <div className="flex items-baseline justify-between gap-4 p-4 sm:px-6 sm:py-5">
              <h2 className="text-h5 font-medium tracking-heading text-ink">{month}</h2>
              <span className="text-small text-smoke">{weeks.length} {weeks.length === 1 ? "week" : "weeks"}</span>
            </div>
            <ul>
              {weeks.map((week) => (
                <li key={week.weekStartDate} className="border-t border-vellum-line">
                  <Link
                    href={`/progress?week=${week.weekStartDate}`}
                    className={cx(
                      "grid min-h-16 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2.5 px-4 py-3.5 [grid-template-areas:'dates_count'_'bar_bar']",
                      "sm:grid-cols-[140px_minmax(0,200px)_1fr_24px] sm:gap-4 sm:px-6 sm:py-0 sm:[grid-template-areas:'dates_bar_count_chevron']",
                      "lg:grid-cols-[200px_minmax(0,320px)_1fr_24px] lg:gap-6",
                      "transition-colors duration-120 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-vellum active:bg-vellum-line",
                      FOCUS_INSET,
                    )}
                  >
                    <span className="text-body text-ink [grid-area:dates]">{week.label}</span>
                    <span aria-hidden className="h-1 overflow-hidden rounded-pill bg-vellum-line [grid-area:bar]">
                      <span className="block h-full rounded-pill bg-accent" style={{ width: `${week.completionPercent}%` }} />
                    </span>
                    <span className="justify-self-end text-small text-smoke [grid-area:count]">{week.done} of {week.total} done</span>
                    <span className="hidden justify-self-end [grid-area:chevron] sm:block"><Chevron /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
