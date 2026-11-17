"use client";

import { cx } from "@/components/ui/classes";
import { CARD } from "../students/controls";
import { signed, shortDate, type Performance } from "./history";

export function NoAnalytics() {
  return (
    <div className={cx(CARD, "flex flex-col gap-1 px-5 py-8 sm:px-6")}>
      <p className="text-small font-medium text-ink">No confirmed analytics on file.</p>
      <p className="max-w-prose text-small text-smoke">Progress shows after the student uploads their 7Sage analytics. Open in lab starts from a preset.</p>
    </div>
  );
}

export function FirstSnapshotNote({ perf }: { perf: Performance }) {
  if (perf.snapshots.length !== 1) return null;
  return <p className="text-small text-smoke">No past weeks yet. This is the onboarding snapshot from {shortDate(perf.snapshots[0]!.week)}; changes show after the next upload.</p>;
}

export function Change({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className={cx("text-fog", className)}>—</span>;
  const pts = Math.round(value * 100);
  const tone = pts > 0 ? "text-success-ink" : pts < 0 ? "text-danger-ink" : "text-smoke";
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap tabular-nums", tone, className)}>
      <span aria-hidden className="text-[10px]">{pts > 0 ? "▲" : pts < 0 ? "▼" : "•"}</span>
      {signed(value)}<span className="sr-only"> points</span>
    </span>
  );
}
