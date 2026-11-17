"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import type { ScheduleReasonCode, WeeklySchedule } from "@/lib/types";
import { PRESS } from "../../chrome";
import { MAX_WEEKS, shortDay, type ChainEnd } from "../model";
import type { Lab } from "../parts";


const LONG_MONTH = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const month = (iso: string) => LONG_MONTH.format(new Date(`${iso}T00:00:00Z`));

export const weekReasons = (s: WeeklySchedule) => s.reasons?.filter((r) => r.placement.scope === "week") ?? [];

export const REASON_NAME: Record<ScheduleReasonCode, string> = {
  capacity_overage: "Over daily time",
  skip_reduction: "Lighter week",
  starred_rotation: "Starred rotation",
  full_section_dropped: "No full section",
  rest_day_moved: "Rest day moved",
  no_practice_test: "No practice test",
  near_test_week: "Near-test week",
  unscheduled_day: "Not scheduled",
  review_carried_over: "Review carried over",
  practice_test_review_day_next_week: "Review next Monday",
  missed_type_priority: "Missed type first",
};

export function endText(end: ChainEnd, testMonth: string) {
  if (!end) return null;
  return end.kind === "limit" ? `The lab builds up to ${MAX_WEEKS} weeks.` : `The ${month(testMonth)} test comes before the week of ${shortDay(end.nextWeekOf)}.`;
}

export function chainPlace(lab: Lab) {
  const chain = lab.chain;
  const week = lab.week;
  if (!chain || !week) return null;
  const last = week.number === chain.weeks.length;
  return {
    chain, week,
    canEarlier: week.number > 1,
    canNext: !last || chain.end === null,
    stop: last ? endText(chain.end, lab.draft.testMonth) : null,
  };
}

export function useWeekMotion(lab: Lab) {
  const [dir, setDir] = useState<"next" | "earlier" | null>(null);
  const go = (to: number) => {
    const from = lab.week?.number ?? 1;
    setDir(to + 1 > from ? "next" : "earlier");
    lab.show(to);
  };
  return { dir, go };
}

export function WeekSwap({ lab, dir, children, className }: { lab: Lab; dir: "next" | "earlier" | null; children: ReactNode; className?: string }) {
  return <div key={lab.week?.number} data-dir={dir ?? undefined} className={cx(dir && "week-in", className)}>{children}</div>;
}

const PILL = cx("flex h-10 shrink-0 items-center gap-1.5 rounded-pill border px-4 text-small whitespace-nowrap shadow-control disabled:pointer-events-none disabled:border-vellum-line disabled:bg-paper disabled:text-fog disabled:shadow-none", PRESS);
const QUIET = cx(PILL, "border-vellum-line bg-paper text-ink pointer-hover:hover:bg-vellum");
const PRIMARY = cx(PILL, "border-ink bg-ink text-chalk pointer-hover:hover:bg-accent");

export function ChainButtons({ lab, go, short = false }: { lab: Lab; go: (to: number) => void; short?: boolean }) {
  const place = chainPlace(lab);
  if (!place) return null;
  const at = place.week.number - 1;
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={!place.canEarlier} onClick={() => go(at - 1)} className={QUIET} aria-label="Earlier week">
        <span aria-hidden>←</span>{short ? null : " Earlier week"}
      </button>
      <button type="button" disabled={!place.canNext} onClick={() => go(at + 1)} className={PRIMARY}
        title={place.stop ?? undefined}>
        Next week <span aria-hidden>→</span>
      </button>
    </div>
  );
}
