"use client";

import { Fragment } from "react";
import { FOCUS, cx } from "@/components/ui/classes";
import { DAY_ORDER } from "@/lib/engine";
import { shortDuration } from "@/lib/formatDuration";
import type { Accommodation } from "@/lib/studyProfileDraft";
import {
  DAILY_CAPACITY_STEP_MINUTES as STEP,
  DAY_LABEL,
  MAX_DAILY_CAPACITY_MINUTES as MAX,
  MIN_DAILY_CAPACITY_MINUTES as MIN,
} from "@/lib/studentProfile";
import { DAY_SHORT_LABEL, practiceTestFact, weeklyTotalMinutes, type WeekValues } from "@/lib/studyWeek";
import type { DayOfWeek } from "@/lib/types";

export const WEEK_NOTE_ID = "week-note";

const TIME_OPTIONS = Array.from({ length: (MAX - MIN) / STEP + 1 }, (_, i) => MIN + i * STEP);
const clamp = (minutes: number) => Math.min(MAX, Math.max(MIN, minutes));

const COLUMNS = (
  <colgroup>
    <col className="w-12 sm:w-16" />
    <col />
    <col className="w-16 sm:w-[88px]" />
  </colgroup>
);

const STEP_BUTTON = cx(
  "grid size-11 shrink-0 place-items-center rounded-sm text-body text-ink transition-colors duration-(--duration-fast) ease-out",
  "enabled:pointer-hover:bg-vellum enabled:active:bg-vellum-line disabled:cursor-not-allowed disabled:text-fog",
  FOCUS,
);

function Stepper({ label, dayName, minutes, onChange }: { label: string; dayName: string; minutes: number; onChange: (minutes: number) => void }) {
  return (
    <div className="flex h-11 items-center rounded-sm border border-vellum-line bg-paper">
      <button type="button" aria-label={`15 min less on ${dayName}`} disabled={minutes <= MIN} onClick={() => onChange(clamp(minutes - STEP))} className={STEP_BUTTON}>
        −
      </button>
      <select
        aria-label={label}
        value={minutes}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cx(
          "h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-center text-body font-medium whitespace-nowrap tabular-nums text-ink [text-align-last:center]",
          FOCUS,
        )}
      >
        {TIME_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {shortDuration(m)}
          </option>
        ))}
      </select>
      <button type="button" aria-label={`15 min more on ${dayName}`} disabled={minutes >= MAX} onClick={() => onChange(clamp(minutes + STEP))} className={STEP_BUTTON}>
        +
      </button>
    </div>
  );
}

export function WeekStepperTable({
  values,
  allDaysMinutes,
  accommodation,
  continueBlockedReason,
  onAllDaysChange,
  onApplyAllDays,
  onDayChange,
  onPracticeTestDayChange,
}: {
  values: WeekValues;
  allDaysMinutes: number;
  accommodation: Accommodation;
  continueBlockedReason: string | null;
  onAllDaysChange: (minutes: number) => void;
  onApplyAllDays: () => void;
  onDayChange: (day: DayOfWeek, minutes: number) => void;
  onPracticeTestDayChange: (day: DayOfWeek) => void;
}) {
  const ptDay = values.preferredPracticeTestDay;
  return (
    <div className="flex flex-col">
      <table className="-mx-2 w-[calc(100%+1rem)] table-fixed border-collapse">
        {COLUMNS}
        <thead>
          <tr className="text-caption text-smoke">
            <th scope="col" className="pb-2 pl-2 text-left font-regular">Day</th>
            <th scope="col" className="pb-2 text-left font-regular">Study time</th>
            <th scope="col" className="pr-2 pb-2 text-center font-regular">Practice test</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-vellum">
            <th scope="row" className="rounded-l-sm py-2 pl-2 text-left text-small font-medium text-ink">All</th>
            <td className="py-2">
              <Stepper label="All days study time" dayName="all days" minutes={allDaysMinutes} onChange={onAllDaysChange} />
            </td>
            <td className="rounded-r-sm py-2 pr-2 pl-2 sm:pl-3">
              <button
                type="button"
                onClick={onApplyAllDays}
                className={cx(
                  "h-11 w-full rounded-sm border border-vellum-line bg-paper text-small font-medium text-ink transition-colors duration-(--duration-fast) ease-out pointer-hover:bg-vellum active:bg-vellum-line",
                  FOCUS,
                )}
              >
                Apply
              </button>
            </td>
          </tr>
          {DAY_ORDER.map((day) => {
            const pt = ptDay === day;
            const message = pt ? continueBlockedReason : null;
            const tint = cx("transition-colors duration-(--duration-fast) ease-out", pt && "bg-accent/faint");
            return (
              <Fragment key={day}>
                <tr className={cx(tint, !message && "border-b border-vellum-line")}>
                  <th scope="row" className={cx("py-2 pl-2 text-left text-small font-medium", pt ? "text-accent" : "text-ink")}>
                    {DAY_SHORT_LABEL[day]}
                  </th>
                  <td className="py-2">
                    <Stepper label={`${DAY_LABEL[day]} study time`} dayName={DAY_LABEL[day]} minutes={values.dailyCapacityMinutes[day]} onChange={(minutes) => onDayChange(day, minutes)} />
                  </td>
                  <td className="py-2 pr-2 text-center">
                    <label className="inline-flex size-11 cursor-pointer items-center justify-center">
                      <input
                        type="radio"
                        name="preferredPracticeTestDay"
                        aria-label={`Practice test on ${DAY_LABEL[day]}`}
                        aria-describedby={message ? WEEK_NOTE_ID : undefined}
                        checked={pt}
                        onChange={() => onPracticeTestDayChange(day)}
                        className={cx("size-5 accent-accent", FOCUS)}
                      />
                    </label>
                  </td>
                </tr>
                {message && (
                  <tr className={cx(tint, "border-b border-vellum-line starting:bg-transparent")}>
                    <td />
                    <td colSpan={2} className="pr-2 pb-2.5">
                      <p id={WEEK_NOTE_ID} className="text-caption text-danger-ink">{message}</p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-col gap-3 pt-4">
        <p className="flex items-baseline justify-between">
          <span className="text-small text-smoke">Weekly total</span>
          <span aria-live="polite" className="text-small font-semibold tabular-nums text-ink">
            {shortDuration(weeklyTotalMinutes(values))}
          </span>
        </p>
        {!ptDay ? (
          <p id={WEEK_NOTE_ID} className="text-small text-smoke">{continueBlockedReason}</p>
        ) : (
          !continueBlockedReason && (
            <p className="text-small text-smoke">
              <span className="font-medium text-ink">{DAY_LABEL[ptDay]}</span> has {shortDuration(values.dailyCapacityMinutes[ptDay])}. {practiceTestFact(accommodation)}
            </p>
          )
        )}
      </div>
    </div>
  );
}
