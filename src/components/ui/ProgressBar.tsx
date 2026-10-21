import { StatusIcon } from "./StatusIcon";
import { cx } from "./classes";

export type ProgressBarProps = {
  done: number;
  total: number;
  // Activities due on or before today. Adds the today tick and the pace status.
  dueSoFar?: number;
  className?: string;
};

const share = (part: number, total: number) => (total > 0 ? Math.min(100, Math.max(0, (part / total) * 100)) : 0);

function PaceStatus({ done, dueSoFar }: { done: number; dueSoFar: number }) {
  const lead = done - dueSoFar;
  return (
    <span className="flex items-center gap-1.5 text-small text-ink">
      <StatusIcon name={lead < 0 ? "warning" : "check-circle"} />
      {lead < 0 ? `${-lead} behind` : lead > 0 ? `${lead} ahead` : "On pace"}
    </span>
  );
}

export function ProgressBar({ done, total, dueSoFar, className }: ProgressBarProps) {
  const today = dueSoFar === undefined ? null : { at: share(dueSoFar, total), dueSoFar };
  return (
    <div className={cx("flex flex-col gap-3 pb-0.5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-h4 font-medium text-accent">{Math.max(0, total - done)} remaining</span>
        <span className="text-small text-smoke">{done} of {total} done</span>
      </div>
      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Activities done this week"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          className="relative h-2 rounded-pill bg-vellum-line"
        >
          <div className="h-2 rounded-pill bg-accent" style={{ width: `${share(done, total)}%` }} />
          {today !== null && (
            <div data-today-tick className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-[1px] bg-ink" style={{ left: `${today.at}%` }} />
          )}
        </div>
        {today !== null && (
          <div className={cx("relative flex h-4.5 items-center", today.at > 75 ? "justify-start" : "justify-end")}>
            <span className="absolute -translate-x-1/2 text-caption text-smoke" style={{ left: `clamp(18px, ${today.at}%, calc(100% - 18px))` }}>Today</span>
            <PaceStatus done={done} dueSoFar={today.dueSoFar} />
          </div>
        )}
      </div>
    </div>
  );
}
