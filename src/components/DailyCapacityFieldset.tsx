"use client";

import { useId, useState } from "react";
import { DAY_ORDER } from "@/lib/engine";
import { formatDuration } from "@/lib/formatDuration";
import { DAY_LABEL, dailyCapacityError, everyDay, minuteOptionsForHour } from "@/lib/studentProfile";
import type { DayOfWeek } from "@/lib/types";

const HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const fieldClass = "rounded-sm border border-vellum-line bg-paper px-2 py-2 text-sm text-ink";
const invalidFieldClass = "rounded-sm border border-danger bg-paper px-2 py-2 text-sm text-ink";

// A daily capacity as an hours select plus a minutes select on the
// 15-minute step. The minute options are limited to whatever is valid for
// the selected hour, so the student can never land on a value the daily
// capacity range then rejects (0 h 00/15 min, or 8 h 15/30/45 min).
export function DurationSelect({
  value,
  onChange,
  label,
  errorId,
  className = "flex items-center gap-1.5",
  selectClassName,
}: {
  value: number;
  onChange: (minutes: number) => void;
  label: string;
  errorId?: string;
  className?: string;
  selectClassName?: string;
}) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  const minuteOptions = minuteOptionsForHour(hours);
  const fieldClassName = selectClassName ?? (errorId ? invalidFieldClass : fieldClass);
  return (
    <span className={className}>
      <select
        aria-label={`${label} hours`}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        value={hours}
        onChange={(e) => {
          const newHours = Number(e.target.value);
          const validMinutes = minuteOptionsForHour(newHours);
          const clampedMinutes = validMinutes.includes(minutes)
            ? minutes
            : validMinutes.reduce((closest, m) =>
                Math.abs(m - minutes) < Math.abs(closest - minutes) ? m : closest
              );
          onChange(newHours * 60 + clampedMinutes);
        }}
        className={fieldClassName}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h} h
          </option>
        ))}
      </select>
      <select
        aria-label={`${label} minutes`}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        value={minutes}
        onChange={(e) => onChange(hours * 60 + Number(e.target.value))}
        className={fieldClassName}
      >
        {minuteOptions.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")} min
          </option>
        ))}
      </select>
    </span>
  );
}

interface DailyCapacityFieldsetProps {
  value: Record<DayOfWeek, number>;
  onChange: (value: Record<DayOfWeek, number>) => void;
}

export default function DailyCapacityFieldset({ value, onChange }: DailyCapacityFieldsetProps) {
  const id = useId();
  const [allDays, setAllDays] = useState(value.MONDAY);
  const allDaysError = dailyCapacityError(allDays);
  const total = DAY_ORDER.reduce((sum, day) => sum + value[day], 0);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-smoke">Daily capacity</legend>
      <p className="-mt-1 text-sm text-smoke">How long can you study each day?</p>
      <p className="-mt-1 text-sm text-smoke">We pick your rest day. Every day needs at least 30 min.</p>

      <div className="rounded-sm bg-vellum p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-sm text-smoke">Set all days</span>
          <DurationSelect
            label="All days"
            value={allDays}
            onChange={setAllDays}
            errorId={allDaysError ? `${id}-all-error` : undefined}
          />
          <button
            type="button"
            disabled={Boolean(allDaysError)}
            onClick={() => onChange(everyDay(allDays))}
            className="rounded-sm px-3 py-2 text-sm font-medium text-smoke transition-colors duration-150 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
        {allDaysError && (
          <p id={`${id}-all-error`} className="mt-1 text-right text-sm text-danger-ink">
            {allDaysError}
          </p>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-vellum-line">
        {DAY_ORDER.map((day) => {
          const error = dailyCapacityError(value[day]);
          const errorId = `${id}-${day}-error`;
          return (
            <li key={day} className="py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">{DAY_LABEL[day]}</span>
                <DurationSelect
                  label={DAY_LABEL[day]}
                  value={value[day]}
                  onChange={(minutes) => onChange({ ...value, [day]: minutes })}
                  errorId={error ? errorId : undefined}
                />
              </div>
              {error && (
                <p id={errorId} className="mt-1 text-right text-sm text-danger-ink">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="text-sm text-smoke">
        Total: {formatDuration(total)} per week
      </p>
    </fieldset>
  );
}
