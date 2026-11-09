"use client";

import { useState } from "react";
import { PillTag } from "@/components/ui/PillTag";
import { MOTION, cx } from "@/components/ui/classes";
import { OnboardingChrome } from "../chrome";
import { FREE_WEEK, PLANS, type PlanName } from "../protoData";
import { PlanFoot, PreviewPanel, StepTitle } from "../protoParts";

export default function PlanChoiceReceipt() {
  const [plan, setPlan] = useState<PlanName>("weekly");
  const option = PLANS[plan];
  return (
    <OnboardingChrome preview={<FirstWeekPreview />}>
      <div className="flex flex-col gap-8">
        <StepTitle title="Pick your plan" lead="Both plans get the same weekly schedules. Your free week comes first." />
        <fieldset className="flex flex-col rounded-md border border-vellum-line">
          <legend className="sr-only">Plan</legend>
          {(Object.keys(PLANS) as PlanName[]).map((name) => {
            const row = PLANS[name];
            const picked = plan === name;
            return (
              <label
                key={name}
                className={cx(
                  "flex cursor-pointer items-center gap-3 border-b border-vellum-line px-4 py-4 first:rounded-t-md last:rounded-b-md last:border-b-0 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-accent",
                  picked ? "bg-vellum" : "hover:bg-vellum/60",
                  MOTION,
                )}
              >
                <input type="radio" name="plan" value={name} checked={picked} onChange={() => setPlan(name)} className="sr-only" />
                <span aria-hidden className={cx("flex size-4 shrink-0 items-center justify-center rounded-full border", picked ? "border-ink" : "border-fog", MOTION)}>
                  <span className={cx("size-2 rounded-full bg-ink transition-[scale,opacity] duration-(--duration-fast) ease-out", picked ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-body font-medium text-ink">{row.name}</span>
                  {row.tag && <PillTag>{row.tag}</PillTag>}
                </span>
                <span className="shrink-0 text-body text-ink tabular-nums">
                  {row.price} <span className="text-small text-smoke">{row.per}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <section aria-label="What you pay" className="flex flex-col gap-3 rounded-md bg-vellum p-5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-small font-medium text-ink">Due today</span>
            <span className="text-h4 font-semibold text-ink tabular-nums">$0.00</span>
          </div>
          <div className="flex flex-col gap-2 border-t border-dashed border-fog/60 pt-3 text-small">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-smoke">Free week ends</span>
              <span className="text-ink tabular-nums">{FREE_WEEK.endsShort}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-smoke">First charge, {FREE_WEEK.firstChargeShort}</span>
              <span key={plan} className="proto-value-in text-ink tabular-nums">{option.price}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span key={plan} className="proto-value-in text-smoke">{option.renewsLine}</span>
              <span key={`${plan}-price`} className="proto-value-in text-ink tabular-nums">{option.price}</span>
            </div>
          </div>
        </section>
        <PlanFoot plan={plan} />
      </div>
    </OnboardingChrome>
  );
}

const DAYS: { day: string; drills: number }[] = [
  { day: "Thursday", drills: 3 },
  { day: "Friday", drills: 2 },
  { day: "Saturday", drills: 4 },
];

function FirstWeekPreview() {
  return (
    <PreviewPanel label="Preview of your first week">
      <div className="flex max-w-[640px] flex-col gap-2.5 rounded-sm border border-vellum-line bg-paper p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-body font-semibold text-ink">Your weekly schedule starts today</h2>
          <PillTag tone="muted">Free until {FREE_WEEK.endsShort}</PillTag>
        </div>
        {DAYS.map(({ day, drills }) => (
          <div key={day} className="flex flex-col gap-2 border-t border-vellum-line pt-3">
            <span className="text-small font-medium text-ink">{day}</span>
            {Array.from({ length: drills }, (_, index) => (
              <span key={index} className="flex h-9 items-center gap-3 rounded-xs border border-dashed border-accent/40 bg-accent/faint px-3">
                <span className="h-2 w-28 rounded bg-accent/30" />
                <span className="h-2 w-10 rounded bg-accent/20" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </PreviewPanel>
  );
}
