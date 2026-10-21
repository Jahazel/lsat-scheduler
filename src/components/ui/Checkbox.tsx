import type { InputHTMLAttributes, ReactNode } from "react";
import { FOCUS, MOTION, cx } from "./classes";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode };

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cx("group flex cursor-pointer items-center gap-3 text-small text-ink", className)}>
      <span className="relative flex size-4 shrink-0">
        <input
          type="checkbox"
          className={cx(
            "peer size-4 cursor-pointer appearance-none rounded-[4px] border border-smoke bg-paper",
            "group-hover:border-ink group-hover:not-checked:bg-vellum focus-visible:border-ink checked:border-ink checked:bg-ink",
            MOTION,
            FOCUS,
          )}
          {...props}
        />
        <svg
          viewBox="0 0 10 10"
          aria-hidden
          className="pointer-events-none absolute inset-0.75 hidden size-2.5 peer-checked:block"
        >
          <path d="M2 5.2l2 2L8 3" fill="none" className="stroke-paper" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label}
    </label>
  );
}
