import type { ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import { formatDuration } from "@/lib/formatDuration";
import { DAY_LABEL, attemptMonthName, goalTestMonth, type OfficialAttempt } from "@/lib/studentProfile";
import { TEST_TIME_LABEL, practiceTestFact, previewWeek, weeklyTotalMinutes } from "@/lib/studyWeek";
import type { Student } from "@/lib/types";
import { MonthCard, PanelHeader, plural } from "./HistoryPanels";

const LOCKED = "flex h-10 min-w-0 items-center rounded-sm bg-vellum px-3 text-small text-ink";
const BODY = "border-t border-vellum-line px-4 py-4 sm:px-5";

function LockedField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <dt className="text-caption text-smoke">{label}</dt>
      <dd className={LOCKED}>{children}</dd>
    </div>
  );
}

export function SettingsPanel({ settings, officialAttempts, today }: { settings: Student; officialAttempts: OfficialAttempt[]; today: string }) {
  const month = goalTestMonth(settings.goalTestDate, today);
  const week = previewWeek(settings);
  const attempts = officialAttempts.toSorted((a, b) => b.month.localeCompare(a.month));
  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title="Settings & tests" aside="What the student sees in Study settings" />
      <MonthCard title="Goal">
        <li className={BODY}>
          <dl className="grid grid-cols-2 items-start gap-4 md:gap-x-5 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <dt className="text-caption text-smoke">Current PT score</dt>
              <dd className="flex h-10 items-center text-small font-medium text-ink tabular-nums">{settings.currentScore}</dd>
            </div>
            <LockedField label="Goal score"><span className="tabular-nums">{settings.goalScore}</span></LockedField>
            <LockedField label="Goal test month" className="col-span-2 md:col-span-1">
              <span className="min-w-0 truncate">{month.label}</span>
              {month.passed && <span className="ml-auto shrink-0 pl-2"><span className="rounded-pill bg-paper px-2.5 py-0.5 text-caption text-warning-ink">Passed</span></span>}
            </LockedField>
            <LockedField label="Test time" className="col-span-2 md:col-span-1">{TEST_TIME_LABEL[settings.accommodationMultiplier]}</LockedField>
          </dl>
        </li>
      </MonthCard>
      <MonthCard title="Week" count={`${formatDuration(weeklyTotalMinutes(settings))} of study`}>
        <li className={BODY}>
          <div className="lg:max-w-[560px]">
            <table className="w-full border-collapse text-small">
              <caption className="sr-only">Study time each day</caption>
              <tbody>
                {week.days.map((day) => (
                  <tr key={day.day} className="border-b border-vellum-line last:border-b-0">
                    <th scope="row" className="w-24 py-2.5 text-left font-regular text-smoke sm:w-28">{DAY_LABEL[day.day]}</th>
                    <td className="py-2.5 whitespace-nowrap text-ink tabular-nums">{day.time}</td>
                    <td className="py-2.5 text-right">
                      {day.practiceTest && <span className="rounded-pill border border-vellum-line bg-vellum px-2.5 py-0.5 text-caption whitespace-nowrap text-ink">Practice test</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pt-3 text-caption text-smoke">{practiceTestFact(settings.accommodationMultiplier)}</p>
          </div>
        </li>
      </MonthCard>
      <MonthCard title="Official LSAT attempts" count={attempts.length > 0 ? plural(attempts.length, "attempt") : undefined}>
        {attempts.length === 0 ? (
          <li className={cx(BODY, "text-small text-smoke")}>No official attempts yet.</li>
        ) : (
          attempts.map((attempt, index) => (
            <li key={index} className="flex items-center gap-3 border-t border-vellum-line px-4 py-2 sm:px-5">
              <span className={cx(LOCKED, "w-24 shrink-0 tabular-nums")}>{attempt.score}</span>
              <span className={cx(LOCKED, "flex-1")}>{attemptMonthName(attempt.month)}</span>
            </li>
          ))
        )}
        <li className="border-t border-vellum-line px-4 py-3 text-caption text-smoke sm:px-5">For the student&apos;s record. Attempts do not change the plan.</li>
      </MonthCard>
    </div>
  );
}
