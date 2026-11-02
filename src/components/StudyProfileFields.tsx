"use client";

import { Fragment, type ReactNode } from "react";
import { DurationSelect } from "@/components/DailyCapacityFieldset";
import { IconButton } from "@/components/ui/Button";
import { useDeferWhilePointerDown } from "@/components/SnapshotReviewFields";
import { WeekTiles } from "@/components/WeekPreview";
import { DAY_ORDER } from "@/lib/engine";
import { formatDuration } from "@/lib/formatDuration";
import {
  DAY_SHORT_LABEL,
  TEST_TIME_LABEL,
  attemptMessage,
  practiceTestDayIsShort,
  practiceTestFact,
  previewWeek,
  weeklyTotalMinutes,
  type Accommodation,
  type AttemptRow,
  type WeekValues,
} from "@/lib/onboardingWizard";
import { DAY_LABEL, attemptMonths, type upcomingTestMonths } from "@/lib/studentProfile";
import type { DayOfWeek } from "@/lib/types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const FIELD = `h-11 w-full rounded-sm border bg-paper px-3 text-body text-ink ${FOCUS}`;
const SELECT = `h-[34px] min-w-0 flex-1 rounded-sm border bg-paper px-2 text-small text-ink ${FOCUS}`;
const LINK_BUTTON = `font-medium text-ink underline underline-offset-[3px] disabled:cursor-not-allowed disabled:no-underline ${FOCUS}`;

const fieldBox = (invalid: boolean) => `${FIELD} ${invalid ? "border-danger" : "border-vellum-line"}`;

export function FieldMessage({ id, icon = false, children }: { id: string; icon?: boolean; children: ReactNode }) {
  return (
    <p id={id} className={`text-small text-danger-ink ${icon ? "flex items-start gap-1.5" : ""}`}>
      {icon && (
        <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16v.5" />
        </svg>
      )}
      {children}
    </p>
  );
}

export function ScoreInput({
  label,
  value,
  messageId,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  messageId: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-2">
      <span className="text-small font-medium text-ink">{label}</span>
      <input
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={messageId ? true : undefined}
        aria-describedby={messageId ?? undefined}
        className={fieldBox(Boolean(messageId))}
      />
    </label>
  );
}

export function GoalTestDateSelect({
  label,
  value,
  options,
  messageId = null,
  onChange,
}: {
  label: string;
  value: string;
  options: ReturnType<typeof upcomingTestMonths>;
  messageId?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="goal-test-date" className="text-small font-medium text-ink">
        {label}
      </label>
      <select
        id="goal-test-date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={messageId ? true : undefined}
        aria-describedby={messageId ?? undefined}
        className={fieldBox(Boolean(messageId))}
      >
        <option value="" disabled>
          Select a test date
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TestTimeChoice({ value, onChange }: { value: Accommodation; onChange: (value: Accommodation) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-small font-medium text-ink">Test time</legend>
      <div className="flex gap-1 rounded-sm bg-vellum p-1">
        {([1, 1.5, 2] satisfies Accommodation[]).map((multiplier) => (
          <label
            key={multiplier}
            className="flex h-9 flex-1 cursor-pointer items-center justify-center rounded text-small text-smoke transition-colors duration-150 ease-out hover:bg-vellum-line hover:text-ink has-[:checked]:bg-paper has-[:checked]:font-medium has-[:checked]:text-ink has-[:checked]:shadow-control has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
          >
            <input type="radio" name="testTime" className="sr-only" checked={value === multiplier} onChange={() => onChange(multiplier)} />
            {TEST_TIME_LABEL[multiplier]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function OfficialAttemptRows({
  idPrefix,
  rows,
  today,
  canRemove,
  canAdd,
  addLabel,
  onEdit,
  onLeave,
  onRemove,
  onAdd,
}: {
  idPrefix: string;
  rows: AttemptRow[];
  today: string;
  canRemove: boolean;
  canAdd: boolean;
  addLabel: string;
  onEdit: (id: number, values: Partial<Pick<AttemptRow, "score" | "month">>) => void;
  onLeave: (id: number, part: "score" | "row") => void;
  onRemove: (id: number) => void;
  onAdd: () => void;
}) {
  const deferWhilePointerDown = useDeferWhilePointerDown();
  const months = attemptMonths(today);

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div aria-hidden className="flex gap-3 text-caption text-smoke">
        <span className="w-24 shrink-0">Score</span>
        <span className="flex-1">Month and year</span>
        <span className="w-8 shrink-0" />
      </div>
      {rows.map((row, index) => {
        const message = attemptMessage(row);
        const messageId = `${idPrefix}-attempt-${row.id}-message`;
        const describedBy = (box: "score" | "month") => (message?.box === box ? messageId : undefined);
        return (
          <div
            key={row.id}
            className="flex flex-col gap-2"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) deferWhilePointerDown(() => onLeave(row.id, "row"));
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-24 shrink-0">
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={`Attempt ${index + 1} score`}
                  value={row.score}
                  onChange={(e) => onEdit(row.id, { score: e.target.value })}
                  onBlur={() => deferWhilePointerDown(() => onLeave(row.id, "score"))}
                  aria-invalid={message?.box === "score" ? true : undefined}
                  aria-describedby={describedBy("score")}
                  className={fieldBox(message?.box === "score")}
                />
              </div>
              <div className="min-w-0 flex-1">
                <select
                  aria-label={`Attempt ${index + 1} month and year`}
                  value={row.month}
                  onChange={(e) => onEdit(row.id, { month: e.target.value })}
                  aria-invalid={message?.box === "month" ? true : undefined}
                  aria-describedby={describedBy("month")}
                  className={fieldBox(message?.box === "month")}
                >
                  <option value="" disabled>
                    Select a month
                  </option>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              {canRemove ? (
                <IconButton label={`Remove attempt ${index + 1}`} onClick={() => onRemove(row.id)}>
                  <svg aria-hidden className="text-smoke" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
                  </svg>
                </IconButton>
              ) : (
                <span className="w-8 shrink-0" />
              )}
            </div>
            {message && <FieldMessage id={messageId}>{message.text}</FieldMessage>}
          </div>
        );
      })}
      {canAdd && (
        <button type="button" onClick={onAdd} className={`flex items-center gap-2 self-start pt-1 text-small ${LINK_BUTTON}`}>
          <svg aria-hidden viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 2.5v9M2.5 7h9" />
          </svg>
          {addLabel}
        </button>
      )}
    </div>
  );
}

export function WeekFields({
  values,
  allDaysMinutes,
  accommodation,
  dayMessages = {},
  hintShortPracticeTestDay = false,
  onAllDaysChange,
  onApplyAllDays,
  onDayChange,
  onPracticeTestDayChange,
}: {
  values: WeekValues;
  allDaysMinutes: number;
  accommodation: Accommodation;
  dayMessages?: Partial<Record<DayOfWeek, string>>;
  hintShortPracticeTestDay?: boolean;
  onAllDaysChange: (minutes: number) => void;
  onApplyAllDays: () => void;
  onDayChange: (day: DayOfWeek, minutes: number) => void;
  onPracticeTestDayChange: (day: DayOfWeek) => void;
}) {
  return (
    <div>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-12 lg:w-20" />
          <col />
          <col className="w-[60px] lg:w-[100px]" />
        </colgroup>
        <thead>
          <tr className="text-caption text-smoke">
            <th scope="col" className="pb-2 pl-2 text-left font-regular lg:pl-3">Day</th>
            <th scope="col" className="pb-2 text-left font-regular">Study time</th>
            <th scope="col" className="pb-2 text-center font-regular">Practice test</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-vellum">
            <th scope="row" className="rounded-l-sm py-2 pl-2 text-left text-small font-medium text-ink lg:pl-3">
              All<span className="hidden lg:inline"> days</span>
            </th>
            <td className="py-2">
              <DurationSelect label="All days" value={allDaysMinutes} onChange={onAllDaysChange} className="flex gap-2" selectClassName={`${SELECT} border-vellum-line`} />
            </td>
            <td className="rounded-r-sm py-2 text-center">
              <button
                type="button"
                onClick={onApplyAllDays}
                className={`h-[34px] rounded-sm border border-ink bg-paper px-2 text-small font-medium text-ink lg:px-3 hover:bg-vellum ${FOCUS}`}
              >
                Apply
              </button>
            </td>
          </tr>
          {DAY_ORDER.map((day) => {
            const message = dayMessages[day];
            const messageId = `capacity-${day}-message`;
            return (
              <Fragment key={day}>
                <tr className={message ? undefined : "border-b border-vellum-line"}>
                  <th scope="row" className="py-1 pl-2 text-left text-small font-medium text-ink lg:pl-3">
                    {DAY_SHORT_LABEL[day]}
                  </th>
                  <td className="py-1">
                    <DurationSelect
                      label={DAY_LABEL[day]}
                      value={values.dailyCapacityMinutes[day]}
                      onChange={(minutes) => onDayChange(day, minutes)}
                      errorId={message ? messageId : undefined}
                      className="flex gap-2"
                      selectClassName={`${SELECT} ${message ? "border-danger" : "border-vellum-line"}`}
                    />
                  </td>
                  <td className="py-1 text-center">
                    <label className="inline-flex size-11 cursor-pointer items-center justify-center">
                      <input
                        type="radio"
                        name="preferredPracticeTestDay"
                        aria-label={`Practice test on ${DAY_LABEL[day]}`}
                        checked={values.preferredPracticeTestDay === day}
                        onChange={() => onPracticeTestDayChange(day)}
                        className={`size-5 accent-accent ${FOCUS}`}
                      />
                    </label>
                  </td>
                </tr>
                {message && (
                  <tr className="border-b border-vellum-line">
                    <td />
                    <td colSpan={2} className="pb-2.5">
                      <FieldMessage id={messageId} icon>
                        {message}
                      </FieldMessage>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-col gap-1 px-2 pt-5 lg:px-3">
        <p className="flex items-baseline justify-between">
          <span className="text-small text-smoke">Weekly total</span>
          <span aria-live="polite" className="text-body font-semibold text-ink">
            {formatDuration(weeklyTotalMinutes(values))}
          </span>
        </p>
        <p className="text-small text-smoke">
          {practiceTestFact(accommodation)}
          {hintShortPracticeTestDay && practiceTestDayIsShort(values, accommodation) && " Pick a day with that much time."}
        </p>
      </div>
    </div>
  );
}

export function LiveWeekPreview({ values, highlight }: { values: WeekValues; highlight: DayOfWeek | null }) {
  const week = previewWeek(values);
  return (
    <>
      <p className="flex items-baseline gap-3">
        <span className="text-body font-semibold text-ink">Your week</span>
        <span className="text-small text-smoke">{week.summary}</span>
      </p>
      <WeekTiles days={week.days} highlight={highlight} />
    </>
  );
}
