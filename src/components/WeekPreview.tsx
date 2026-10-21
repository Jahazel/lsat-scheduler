import type { ReactNode } from "react";
import type { DayOfWeek } from "@/lib/types";

export interface WeekTile {
  day: DayOfWeek;
  label: string;
  time: string;
  practiceTest: boolean;
  barShare: number;
}

const BAR_MAX_PX = 130;

export function WeekTiles({ days, highlight, className = "" }: { days: WeekTile[]; highlight: DayOfWeek | null; className?: string }) {
  return (
    <ol className={`flex max-w-[636px] gap-1 min-[1440px]:gap-2 ${className}`}>
      {days.map(({ day, label, time, practiceTest, barShare }) => (
        <li
          key={day}
          className={`flex h-[200px] min-w-0 max-w-[84px] flex-1 flex-col justify-between rounded-sm border bg-paper p-2 min-[1440px]:p-3 ${
            practiceTest ? "border-accent" : day === highlight ? "border-ink" : "border-vellum-line"
          }`}
        >
          <span className="flex flex-col gap-0.5">
            <span className={`text-caption ${practiceTest ? "text-accent" : "text-smoke"}`}>{label}</span>
            <span className="whitespace-nowrap text-small font-semibold text-ink min-[1440px]:text-body">{time}</span>
          </span>
          <span
            className={`flex w-full items-end rounded ${practiceTest ? "bg-ink p-2 text-caption font-medium leading-[14px] text-chalk" : "bg-accent/14"}`}
            style={{ height: Math.round(barShare * BAR_MAX_PX) }}
          >
            {practiceTest && "PT"}
          </span>
        </li>
      ))}
    </ol>
  );
}

function FlagIcon() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="size-2.5" fill="currentColor" stroke="currentColor" strokeLinejoin="round">
      <path d="M2 9V1.5h5.5L6.5 3.5l1 2H2" />
    </svg>
  );
}

export interface DrillItem {
  minutes?: string;
  label: string;
  detail: { kind: "accuracy" | "flag"; text: string } | null;
}

export function DrillList({ title, tag, items }: { title: ReactNode; tag: string; items: DrillItem[] }) {
  return (
    <>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-small font-semibold text-ink">{title}</span>
        <span className="flex items-center gap-1.5 rounded-full border border-dashed border-accent px-2 py-0.5 text-caption text-accent">
          <span aria-hidden className="size-1.5 rounded-full border border-accent" />
          {tag}
        </span>
      </p>
      <ul className="flex flex-col gap-2.5">
        {items.map(({ minutes, label, detail }, index) => (
          <li key={index} className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 rounded-sm border border-dashed border-accent/55 bg-accent/4 px-3 py-2">
            {minutes && <span className="w-[52px] shrink-0 font-mono text-caption text-smoke">{minutes}</span>}
            <span className="text-small font-medium text-ink">{label}</span>
            {detail?.kind === "accuracy" && <span className="font-mono text-caption text-accent">{detail.text}</span>}
            {detail?.kind === "flag" && (
              <span className="flex items-center gap-[5px] text-caption text-accent">
                <FlagIcon />
                {detail.text}
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
