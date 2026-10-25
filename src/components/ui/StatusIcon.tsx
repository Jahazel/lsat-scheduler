import { cx } from "./classes";

export type StatusIconName = "open-circle" | "check-disc" | "check-circle" | "warning";

export function StatusIcon({ name, className }: { name: StatusIconName; className?: string }) {
  switch (name) {
    case "open-circle":
      return (
        <svg viewBox="0 0 16 16" aria-hidden className={cx("size-4 shrink-0 text-smoke", className)}>
          <circle cx="8" cy="8" r="7.4" fill="none" className="stroke-current" strokeWidth="1.2" />
        </svg>
      );
    case "check-disc":
      return (
        <svg viewBox="0 0 14 14" aria-hidden className={cx("size-4 shrink-0 text-ink", className)}>
          <circle cx="7" cy="7" r="7" className="fill-current" />
          <path d="M4.1 7.2l2 2 3.8-4.1" fill="none" className="stroke-chalk" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "check-circle":
      return (
        <svg viewBox="0 0 14 14" aria-hidden className={cx("size-3.5 shrink-0 text-ink", className)}>
          <circle cx="7" cy="7" r="5.25" fill="none" className="stroke-current" strokeWidth="1.2" />
          <path d="M4.8 7.1l1.5 1.5 2.9-3" fill="none" className="stroke-current" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 14 14" aria-hidden className={cx("size-3.5 shrink-0 text-warning-ink", className)}>
          <path d="M7 1.75L12.75 11.75H1.25Z" fill="none" className="stroke-current" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M7 5.5v2.75" fill="none" className="stroke-current" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M7 10v.01" fill="none" className="stroke-current" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}

export function CheckGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0 text-success-ink">
      <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className={cx("size-3.5 shrink-0 text-smoke", className)}>
      <circle cx="7" cy="7" r="5.25" fill="none" className="stroke-current" strokeWidth="1.2" />
      <path d="M7 6.5v3" fill="none" className="stroke-current" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 4.5v.01" fill="none" className="stroke-current" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ClockGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0 text-fog">
      <circle cx="6" cy="6" r="4.75" fill="none" className="stroke-current" strokeWidth="1.3" />
      <path d="M6 3.5V6l1.6 1" fill="none" className="stroke-current" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ReadingGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0 animate-spin text-accent motion-reduce:animate-none">
      <path d="M6 1.5a4.5 4.5 0 0 1 4.5 4.5" fill="none" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
