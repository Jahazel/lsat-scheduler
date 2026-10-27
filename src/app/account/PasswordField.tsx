"use client";

import { useId } from "react";
import { FOCUS, cx } from "@/components/ui/classes";

export function PasswordField({ label, name, autoComplete, value, onChange, readOnly, helper, error }: {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  helper?: string;
  error?: string;
}) {
  const id = useId();
  const note = error ?? helper;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        className={cx(
          "h-11 rounded-sm border px-3 text-body text-ink read-only:bg-vellum read-only:text-fog",
          error ? "border-danger-ink" : "border-vellum-line",
          FOCUS,
        )}
      />
      {note && (
        <p id={`${id}-note`} className={cx("text-small", error ? "text-danger-ink" : "text-smoke")}>
          {note}
        </p>
      )}
    </div>
  );
}
