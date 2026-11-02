"use client";

import { minuteOptionsForHour } from "@/lib/studentProfile";

const HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

// A daily capacity as an hours select plus a minutes select on the
// 15-minute step. The minute options are limited to whatever is valid for
// the selected hour, so the student can never land on a value the daily
// capacity range then rejects (0 h 00/15 min, or 8 h 15/30/45 min).
export function DurationSelect({
  value,
  onChange,
  label,
  errorId,
  className,
  selectClassName,
}: {
  value: number;
  onChange: (minutes: number) => void;
  label: string;
  errorId?: string;
  className: string;
  selectClassName: string;
}) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  const minuteOptions = minuteOptionsForHour(hours);
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
        className={selectClassName}
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
        className={selectClassName}
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
