"use client";

import { CARD, CONTENT, GUTTER, LEAD, WEEK_ROW } from "@/app/progress/ProgressOverview";
import { PageHeader } from "@/components/ui/PageHeader";
import { cx } from "@/components/ui/classes";
import { AppChrome } from "../../chrome";
import { useProtoData, useProtoState } from "../../protoContext";
import { planNote, type WeekState } from "../../protoData";
import { PlanNotice } from "../notes/PlanNotice";

const MONTHS = [
  { month: "December 2026", weeks: [{ label: "Dec 7 – Dec 13", done: 22, total: 25 }, { label: "Nov 30 – Dec 6", done: 25, total: 25 }] },
  { month: "November 2026", weeks: [{ label: "Nov 23 – Nov 29", done: 18, total: 24 }, { label: "Nov 16 – Nov 22", done: 24, total: 24 }] },
];

/** Progress for a lapsed student: the This week Notice card above the past weeks, which stay readable. */
export default function ProgressNote() {
  const data = useProtoData();
  const state = (useProtoState() || "lapsed-failed") as WeekState;
  const note = planNote(state, data)!;
  return (
    <AppChrome tab={1}>
      <div data-page-section><PageHeader gutter={GUTTER} title="Progress" lead={LEAD} /></div>
      <div className={CONTENT}>
        <div data-page-section><PlanNotice note={note} /></div>
        {MONTHS.map(({ month, weeks }) => (
          <section key={month} data-page-section aria-label={month} className={CARD}>
            <div className="flex items-baseline justify-between gap-4 p-4 sm:px-6 sm:py-5">
              <h2 className="text-h5 font-medium tracking-heading text-ink">{month}</h2>
              <span className="text-small text-smoke">{weeks.length} weeks</span>
            </div>
            <ul>
              {weeks.map((week) => (
                <li key={week.label} className="border-t border-vellum-line">
                  <span className={cx(WEEK_ROW, "hover:bg-vellum")}>
                    <span className="text-body text-ink [grid-area:dates]">{week.label}</span>
                    <span aria-hidden className="h-1 overflow-hidden rounded-pill bg-vellum-line [grid-area:bar]">
                      <span className="block h-full rounded-pill bg-accent" style={{ width: `${Math.round((week.done / week.total) * 100)}%` }} />
                    </span>
                    <span className="justify-self-end text-small text-smoke [grid-area:count]">{week.done} of {week.total} done</span>
                    <span className="justify-self-end [grid-area:chevron]" />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppChrome>
  );
}
