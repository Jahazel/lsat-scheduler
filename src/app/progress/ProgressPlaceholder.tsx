"use client";

import { useSearchParams } from "next/navigation";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { Card } from "@/components/ui/Card";
import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";
import { CARD, CONTENT, GUTTER, LEAD, WEEK_ROW } from "./ProgressOverview";
import { WEEK_CONTENT, WEEK_HEADER, WEEK_HEADER_ROW, WEEK_PAGER_BUTTONS, WEEK_TITLE_BLOCK } from "./pastWeekLayout";

const PAGER_BUTTON = "h-10 w-34 rounded-pill bg-vellum-line max-sm:h-11 max-sm:w-auto max-sm:flex-1";

export function ListShapes() {
  return (
    <>
      <div className={cx("border-b border-vellum-line bg-paper pt-6 pb-6 md:pt-12 md:pb-10", GUTTER)}>
        <div className="flex flex-col gap-1.5 md:gap-3">
          <p className="text-h3 font-medium md:text-h2"><span className={PLACEHOLDER_SHAPE}>Progress</span></p>
          <p className="text-body md:text-lead"><span className={PLACEHOLDER_SHAPE}>{LEAD}</span></p>
        </div>
      </div>
      <div className={CONTENT}>
        <div className={CARD}>
          <div className="flex items-baseline justify-between gap-4 p-4 sm:px-6 sm:py-5">
            <p className="text-h5 font-medium tracking-heading"><span className={PLACEHOLDER_SHAPE}>November 2026</span></p>
            <span className={cx(PLACEHOLDER_SHAPE, "text-small")}>3 weeks</span>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-t border-vellum-line">
              <div className={WEEK_ROW}>
                <span className="text-body [grid-area:dates]"><span className={PLACEHOLDER_SHAPE}>Nov 16 – 22</span></span>
                <span className="h-1 rounded-pill bg-vellum-line [grid-area:bar]" />
                <span className="justify-self-end text-small [grid-area:count]"><span className={PLACEHOLDER_SHAPE}>0 of 19 done</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function WeekShapes() {
  return (
    <>
      <div className={WEEK_HEADER}>
        <span className={cx(PLACEHOLDER_SHAPE, "text-small font-medium")}>← All weeks</span>
        <div className={WEEK_HEADER_ROW}>
          <div className={WEEK_TITLE_BLOCK}>
            <p className="flex items-center gap-3 text-small">
              <span className="rounded-pill border border-transparent bg-vellum-line px-2.5 py-0.5 text-caption text-transparent">Past week</span>
              <span className={PLACEHOLDER_SHAPE}>0 of 19 done</span>
            </p>
            <p className="text-h3 font-medium md:text-h2"><span className={PLACEHOLDER_SHAPE}>Week of Nov 9</span></p>
            <p className="flex items-center gap-2 text-small">
              <span className="size-3.5 shrink-0 rounded-pill bg-vellum-line" />
              <span className={PLACEHOLDER_SHAPE}>Flaw or descriptive weakening comes first this week. You missed it most on your last practice test.</span>
            </p>
          </div>
          <div className={WEEK_PAGER_BUTTONS}>
            <span className={PAGER_BUTTON} />
            <span className={PAGER_BUTTON} />
          </div>
        </div>
      </div>
      <div className={cx("flex flex-col gap-4", WEEK_CONTENT)}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
              <p className="text-h6 font-medium"><span className={PLACEHOLDER_SHAPE}>Monday Nov 9</span></p>
              <span className={cx(PLACEHOLDER_SHAPE, "text-small")}>Drilling · 1 h 30 min of 1 h 30 min</span>
            </div>
            <div className="flex flex-col">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex min-h-9 items-center gap-2.5 px-2">
                  <span className="size-5 shrink-0 rounded-pill bg-vellum-line" />
                  <span className={cx(PLACEHOLDER_SHAPE, "text-small")}>5 Necessary assumption (L2-4)</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function ProgressPlaceholder() {
  return <PagePlaceholder>{useSearchParams().has("week") ? <WeekShapes /> : <ListShapes />}</PagePlaceholder>;
}
