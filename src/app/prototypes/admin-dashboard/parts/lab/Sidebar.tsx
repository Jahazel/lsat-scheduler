"use client";

import type { ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import { CARD } from "../students/controls";
import { LabTitle } from "./LabTitle";
import { Screenshots } from "./Screenshots";
import { analyticsLabel } from "./model";
import { AnalyticsChoice, ColumnTitle, CopiedNote, CurrentScore, Days, GoalScore, StaleNotice, StartSelect, TestMonth, TestTime, WeekOfSelect, type Lab } from "./parts";
import { useWeekMotion } from "./week/chain";
import { StudentViewTitle, StudentViewWeek } from "./week/StudentView";

function Group({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 border-vellum-line px-5 py-5 not-first:border-t">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-small font-semibold text-ink">{title}</h2>
        {note && <span className="min-w-0 truncate text-caption text-smoke">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function LabSidebar({ lab }: { lab: Lab }) {
  const screenshots = lab.draft.analytics.kind === "upload" || lab.draft.analytics.kind === "screenshots";
  const { go, dir } = useWeekMotion(lab);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <LabTitle />
        <StaleNotice lab={lab} />
      </div>
      <div className="grid items-start gap-x-6 gap-y-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="order-1 lg:order-none"><ColumnTitle title="Inputs" /></div>
        <div className="order-3 flex min-h-8 flex-col justify-center pt-4 lg:order-none lg:pt-0"><StudentViewTitle lab={lab} go={go} /></div>
        <div aria-label="Inputs" role="region" className={cx(CARD, "order-2 min-w-0 lg:sticky lg:top-24 lg:order-none lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]")}>
          <Group title="Preset" note="Fills every input below">
            <StartSelect lab={lab} />
            <CopiedNote lab={lab} />
          </Group>
          <Group title="Goal">
            <div className="grid grid-cols-2 items-start gap-3"><CurrentScore lab={lab} /><GoalScore lab={lab} /></div>
            <TestMonth lab={lab} />
            <TestTime lab={lab} />
          </Group>
          <Group title="Analytics" note={analyticsLabel(lab.draft.analytics)}>
            <AnalyticsChoice lab={lab} hideLegend />
            {screenshots && <Screenshots lab={lab} />}
          </Group>
          <Group title="Week">
            <WeekOfSelect lab={lab} />
            <Days lab={lab} />
          </Group>
        </div>
        <section aria-label="Built week" className="order-4 min-w-0 lg:order-none"><StudentViewWeek lab={lab} dir={dir} /></section>
      </div>
    </div>
  );
}
