"use client";

import { useActionState, useId } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { FieldMessage } from "@/components/StudyProfileFields";
import { Button } from "@/components/ui/Button";
import { FOCUS, cx } from "@/components/ui/classes";
import { callAction } from "@/lib/callAction";
import type { ListedTestMonth } from "@/lib/testMonthRepository";
import { FEW_TEST_MONTHS, testMonthName } from "@/lib/testMonths";
import { isUnexpectedFailure } from "@/lib/unexpectedFailure";
import { addTestMonthFromForm, removeTestMonthFromForm } from "./actions";

const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";
const SELECT = cx("h-11 w-full min-w-0 rounded-sm border border-vellum-line bg-paper px-3 text-body text-ink", FOCUS);
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, i, 1))),
}));
const YEARS_AHEAD = 4;

const students = (count: number) => `${count} ${count === 1 ? "student" : "students"}`;

function AddMonth({ today }: { today: string }) {
  const [answer, action, pending] = useActionState(callAction(addTestMonthFromForm), null);
  const message = useId();
  const thisYear = Number(today.slice(0, 4));
  const shown = answer && !isUnexpectedFailure(answer) ? answer : null;
  return (
    <form action={action} aria-label="Add a test month" className={cx(CARD, "flex flex-col gap-4 p-5")}>
      <h2 className="text-h4 font-semibold text-ink">Add a test month</h2>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-small font-medium text-ink">Month</span>
          <select name="month" defaultValue={Number(today.slice(5, 7))} className={SELECT}>
            {MONTHS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-small font-medium text-ink">Year</span>
          <select name="year" defaultValue={thisYear} className={SELECT}>
            {Array.from({ length: YEARS_AHEAD }, (_, i) => thisYear + i).map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <Button type="submit" size="md" waiting={pending} className="h-11" aria-describedby={shown ? message : undefined}>Add month</Button>
      </div>
      <div aria-live="polite">
        {shown && "added" in shown && <p id={message} className="text-small text-smoke">Added {testMonthName(shown.added)}. Students can pick it now.</p>}
        {shown && "listed" in shown && <FieldMessage id={message} icon>{testMonthName(shown.listed)} is already on the list.</FieldMessage>}
        {shown && "invalid" in shown && <FieldMessage id={message} icon>Choose a month and a year.</FieldMessage>}
      </div>
      <FailureNotice answer={answer} />
    </form>
  );
}

function MonthRow({ month, today }: { month: ListedTestMonth; today: string }) {
  const [answer, action, pending] = useActionState(callAction(removeTestMonthFromForm), null);
  const message = useId();
  const name = testMonthName(month.month);
  const picked = answer && !isUnexpectedFailure(answer) ? answer.picked : null;
  return (
    <li className="flex flex-col gap-2 px-5 py-3">
      <form action={action} className="flex min-h-10 items-center gap-3">
        <input type="hidden" name="month" value={month.month} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <span className={cx("text-body font-medium", month.month > today ? "text-ink" : "text-smoke")}>{name}</span>
          <span className="text-caption text-smoke">
            {month.month > today ? "" : "Passed · "}
            {month.students === 0 ? "No students picked it" : `Picked by ${students(month.students)}`}
          </span>
        </div>
        <Button type="submit" variant="outline" size="md" waiting={pending} aria-label={`Remove ${name}`}
          aria-describedby={picked ? message : undefined}>Remove</Button>
        <FailureNotice answer={answer} />
      </form>
      <div aria-live="polite">
        {picked !== null && (
          <FieldMessage id={message} icon>{students(picked)} picked {name} as their goal, so it stays on the list.</FieldMessage>
        )}
      </div>
    </li>
  );
}

export function TestDates({ months, today }: { months: ListedTestMonth[]; today: string }) {
  const upcoming = months.filter((month) => month.month > today).length;
  return (
    <div className="flex flex-col gap-5">
      <div data-page-section className="flex flex-col gap-2">
        <h1 className="text-h3 font-semibold text-ink">Test dates</h1>
        <p className="text-small text-smoke">
          The LSAT test months students can pick as their goal in onboarding and Study settings, and that the Schedule lab offers.
          Keep at least {FEW_TEST_MONTHS} upcoming months on the list.
        </p>
      </div>
      <div data-page-section><AddMonth today={today} /></div>
      <section data-page-section aria-label="Test months" className={cx(CARD, "overflow-hidden")}>
        <div className="flex items-baseline justify-between gap-3 border-b border-vellum-line px-5 py-4">
          <h2 className="text-h4 font-semibold text-ink">Test months</h2>
          <span className="text-caption text-smoke">{upcoming} upcoming</span>
        </div>
        {months.length === 0
          ? <p className="px-5 py-10 text-center text-small text-smoke">No test months yet. Students cannot pick a goal test month until you add one.</p>
          : <ul className="divide-y divide-vellum-line">{months.map((month) => <MonthRow key={month.month} month={month} today={today} />)}</ul>}
      </section>
    </div>
  );
}
