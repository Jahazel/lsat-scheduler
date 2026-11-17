import type { ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import { CARD } from "../students/controls";


export function PanelHeader({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-h4 font-semibold text-ink">{title}</h2>
        {aside && <p className="text-small text-smoke">{aside}</p>}
      </div>
      {children}
    </div>
  );
}

function CardTitle({ title, count }: { title: string; count?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-4 sm:px-5">
      <h3 className="text-small font-medium text-ink">{title}</h3>
      {count && <span className="text-caption text-smoke">{count}</span>}
    </div>
  );
}

export function MonthCard({ title, count, children }: { title: string; count?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={cx(CARD, "overflow-hidden")}>
      <CardTitle title={title} count={count} />
      <ul>{children}</ul>
    </section>
  );
}

export const ROW = "w-full px-4 text-left transition-colors duration-(--duration-fast) ease-out pointer-hover:hover:bg-vellum sm:px-5";
export const WEEK_COL = "sm:grid-cols-[150px_minmax(0,1fr)_16px]";
export const UNDER_COL = "sm:pl-[calc(150px+1rem+1.25rem)]";

export const Chevron = ({ open }: { open?: boolean }) => (
  <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    className={cx("size-4 text-smoke transition-transform duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:transition-none", open === true && "rotate-90")}>
    <path d="M6 3.5 10.5 8 6 12.5" />
  </svg>
);

export const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
