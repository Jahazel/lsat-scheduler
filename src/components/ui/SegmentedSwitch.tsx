"use client";

import type { ChangeEvent } from "react";
import { MOTION, cx } from "./classes";

export type SegmentedOption<V extends string> = { value: V; label: string };

export type SegmentedSwitchProps<V extends string> = {
  name: string;
  label: string;
  options: readonly SegmentedOption<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  className?: string;
};

export function SegmentedSwitch<V extends string>({ name, label, options, value, defaultValue, onChange, className }: SegmentedSwitchProps<V>) {
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const option = options.find((candidate) => candidate.value === event.target.value);
    if (option) onChange?.(option.value);
  };
  return (
    <div role="radiogroup" aria-label={label} className={cx("flex gap-1 rounded-sm bg-vellum p-1", className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cx(
            "flex h-9 flex-1 cursor-pointer items-center justify-center rounded-[4px] px-2 text-center text-small text-smoke",
            "hover:bg-ink/faint hover:text-ink",
            "has-checked:bg-paper has-checked:font-medium has-checked:text-ink has-checked:shadow-control",
            "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
            MOTION,
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === undefined ? undefined : value === option.value}
            defaultChecked={defaultValue === undefined ? undefined : defaultValue === option.value}
            onChange={change}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
