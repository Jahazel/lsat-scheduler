"use client";

import { useId, type InputHTMLAttributes } from "react";
import { FOCUS, MOTION, cx } from "./classes";

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  helper?: string;
  error?: string;
};

export function TextInput({ label, helper, error, disabled, className, ...props }: TextInputProps) {
  const id = useId();
  const note = error ?? helper;
  return (
    <div className={cx("flex flex-col gap-2", disabled && "opacity-muted", className)}>
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        className={cx(
          "h-11 w-full rounded-md border bg-paper px-4 text-small text-ink placeholder:text-fog",
          error ? "border-danger-ink" : "border-vellum-line hover:border-fog",
          "disabled:bg-vellum disabled:hover:border-vellum-line",
          MOTION,
          FOCUS,
        )}
        {...props}
      />
      {note && (
        <p id={`${id}-note`} className={cx("text-caption", error ? "text-danger-ink" : "text-smoke")}>
          {note}
        </p>
      )}
    </div>
  );
}
