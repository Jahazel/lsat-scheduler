import type { ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import { DAY_LABEL } from "@/lib/studentProfile";
import { TEST_TIME_LABEL, practiceTestFact, weeklyTotalMinutes } from "@/lib/studyWeek";
import { hours } from "../data";
import { MonthCard, PanelHeader, plural } from "./panel";
import { ATTEMPT_NOTE, monthLabel, testMonth, type Settings } from "./settings";

const LOCKED = "flex h-10 min-w-0 items-center rounded-sm bg-vellum px-3 text-small text-ink";
const BODY = "border-t border-vellum-line px-4 py-4 sm:px-5";

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <dt className="text-caption text-smoke">{label}</dt>
      <dd className={LOCKED}>{children}</dd>
    </div>
  );
}

export function SettingsTab({ settings: { saved: s, current, week, attempts } }: { settings: Settings }) {
  const month = testMonth(s.goalTestDate);
  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title="Settings & tests" aside="What the student sees in Study settings" />
      <MonthCard title="Goal">
        <li className={BODY}>
          <dl className="grid grid-cols-2 items-start gap-x-4 gap-y-4 md:gap-x-5 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <dt className="text-caption text-smoke">Current PT score</dt>
              <dd className={cx("flex h-10 items-center text-small tabular-nums", current === null ? "text-smoke" : "font-medium text-ink")}>{current ?? "No analytics yet"}</dd>
            </div>
            <Field label="Goal score"><span className="tabular-nums">{s.goalScore}</span></Field>
            <Field label="Goal test month" className="col-span-2 md:col-span-1"><span className="min-w-0 truncate">{month.label}</span>{month.passed && <span className="ml-auto shrink-0 pl-2"><span className="rounded-pill bg-paper px-2.5 py-0.5 text-caption text-warning-ink">Passed</span></span>}</Field>
            <Field label="Test time" className="col-span-2 md:col-span-1">{TEST_TIME_LABEL[s.accommodationMultiplier]}</Field>
          </dl>
        </li>
      </MonthCard>
      <MonthCard title="Week" count={`${hours(weeklyTotalMinutes(s))} of study`}>
        <li className={BODY}>
          <div className="lg:max-w-[560px]">
            <table className="w-full border-collapse text-small">
              <caption className="sr-only">Study time each day</caption>
              <tbody>
                {week.days.map((d) => (
                  <tr key={d.day} className="border-b border-vellum-line last:border-b-0">
                    <th scope="row" className="w-24 py-2.5 sm:w-28 text-left font-regular text-smoke">{DAY_LABEL[d.day]}</th>
                    <td className="py-2.5 whitespace-nowrap text-ink tabular-nums">{d.time}</td>
                    <td className="py-2.5 text-right">{d.practiceTest && <span className="rounded-pill border whitespace-nowrap border-vellum-line bg-vellum px-2.5 py-0.5 text-caption text-ink">Practice test</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pt-3 text-caption text-smoke">{practiceTestFact(s.accommodationMultiplier)}</p>
          </div>
        </li>
      </MonthCard>
      <MonthCard title="Official LSAT attempts" count={attempts.length > 0 ? plural(attempts.length, "attempt") : undefined}>
        {attempts.length === 0 ? (
          <li className={cx(BODY, "text-small text-smoke")}>No official attempts yet.</li>
        ) : (
          attempts.map((a) => (
            <li key={a.month} className="flex items-center gap-3 border-t border-vellum-line px-4 py-2 sm:px-5">
              <span className={cx(LOCKED, "w-24 shrink-0 tabular-nums")}>{a.score}</span>
              <span className={cx(LOCKED, "flex-1")}>{monthLabel(a.month)}</span>
            </li>
          ))
        )}
        <li className="border-t border-vellum-line px-4 py-3 text-caption text-smoke sm:px-5">{ATTEMPT_NOTE}</li>
      </MonthCard>
    </div>
  );
}
