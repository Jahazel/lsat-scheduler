"use client";

import { useId, useState } from "react";
import { DAY_ORDER } from "@/lib/engine";
import { formatDuration } from "@/lib/formatDuration";
import { dailyCapacityError } from "@/lib/studentProfile";
import type { DayOfWeek } from "@/lib/types";

export const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const MINUTES = [0, 15, 30, 45];

const fieldClass = "rounded-md border border-ink-200 bg-white px-2 py-2 text-sm text-ink-900";
const invalidFieldClass = "rounded-md border border-red-500 bg-white px-2 py-2 text-sm text-ink-900";

export function everyDay(minutes: number): Record<DayOfWeek, number> {
  return Object.fromEntries(DAY_ORDER.map((day) => [day, minutes])) as Record<DayOfWeek, number>;
}

// A daily capacity as an hours select plus a 15-minute select, so the
// student can only pick a value on the 15-minute step.
function DurationSelect({
  value,
  onChange,
  label,
  errorId,
}: {
  value: number;
  onChange: (minutes: number) => void;
  label: string;
  errorId?: string;
}) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  const className = errorId ? invalidFieldClass : fieldClass;
  return (
    <span className="flex items-center gap-1.5">
      <select
        aria-label={`${label} hours`}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        value={hours}
        onChange={(e) => onChange(Number(e.target.value) * 60 + minutes)}
        className={className}
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
        className={className}
      >
        {MINUTES.map((m) => (
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
      <legend className="text-sm font-medium text-ink-700">Daily capacity</legend>
      <p className="-mt-1 text-sm text-ink-500">How long can you study each day?</p>

      <div className="rounded-md bg-ink-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-sm text-ink-700">Set all days</span>
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
            className="rounded-md px-3 py-2 text-sm font-medium text-ink-500 transition-colors duration-150 ease-out hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
        {allDaysError && (
          <p id={`${id}-all-error`} className="mt-1 text-right text-sm text-red-600">
            {allDaysError}
          </p>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-ink-100">
        {DAY_ORDER.map((day) => {
          const error = dailyCapacityError(value[day]);
          const errorId = `${id}-${day}-error`;
          return (
            <li key={day} className="py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-900">{DAY_LABEL[day]}</span>
                <DurationSelect
                  label={DAY_LABEL[day]}
                  value={value[day]}
                  onChange={(minutes) => onChange({ ...value, [day]: minutes })}
                  errorId={error ? errorId : undefined}
                />
              </div>
              {error && (
                <p id={errorId} className="mt-1 text-right text-sm text-red-600">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="text-sm text-ink-700">
        Total: {formatDuration(total)} per week
      </p>
    </fieldset>
  );
}
