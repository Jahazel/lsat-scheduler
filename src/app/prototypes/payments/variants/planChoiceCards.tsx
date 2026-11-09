"use client";

import { useState } from "react";
import { PillTag } from "@/components/ui/PillTag";
import { FOCUS_INSET, MOTION, cx } from "@/components/ui/classes";
import { OnboardingChrome } from "../chrome";
import { FREE_WEEK, PLANS, type PlanName } from "../protoData";
import { PlanFoot, PreviewPanel, StepTitle } from "../protoParts";
import { StripeNext } from "./planChoiceTimeline";

export default function PlanChoiceCards({ preview = "calendar", savingAs = "pill" }: { preview?: "calendar" | "stripe"; savingAs?: "pill" | "text" }) {
  const [plan, setPlan] = useState<PlanName>("weekly");
  return (
    <OnboardingChrome preview={preview === "stripe" ? <StripeNext plan={plan} /> : <FreeWeekCalendar plan={plan} />}>
      <div className="flex flex-col gap-8">
        <StepTitle title="Pick your plan" lead={`Your free week runs until ${FREE_WEEK.endsLong}. You pay nothing before then.`} />
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="sr-only">Plan</legend>
          {(Object.keys(PLANS) as PlanName[]).map((name) => {
            const option = PLANS[name];
            const picked = plan === name;
            return (
              <label
                key={name}
                className={cx(
                  "relative flex cursor-pointer flex-col gap-3 rounded-md border bg-paper p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
                  picked ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-vellum-line hover:border-fog",
                  "transition-[border-color,box-shadow,scale] duration-(--duration-fast) ease-out active:scale-[0.98]",
                )}
              >
                <input type="radio" name="plan" value={name} checked={picked} onChange={() => setPlan(name)} className={cx("sr-only", FOCUS_INSET)} />
                <span className="flex items-center justify-between gap-2">
                  <span className="text-small font-medium text-ink">{option.name}</span>
                  <span aria-hidden className={cx("flex size-4 items-center justify-center rounded-full border", picked ? "border-ink" : "border-fog", MOTION)}>
                    <span className={cx("size-2 rounded-full bg-ink transition-[scale,opacity] duration-(--duration-fast) ease-out", picked ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
                  </span>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-h4 font-semibold text-ink tabular-nums">{option.price}</span>
                  <span className="text-small text-smoke">{option.per}</span>
                </span>
                {savingAs === "pill" ? (
                  option.tag ? <PillTag>{option.tag}</PillTag> : <span className="h-[22px]" aria-hidden />
                ) : (
                  <span className="h-[18px] text-small text-accent">{option.tag}</span>
                )}
              </label>
            );
          })}
        </fieldset>
        <dl className="flex flex-col border-y border-vellum-line text-small">
          <Row term="Today" value="$0" />
          <Row term="Free week ends" value={FREE_WEEK.endsShort} />
          <Row term="First charge" value={`${FREE_WEEK.firstChargeShort} · ${PLANS[plan].price}`} changes={plan} />
        </dl>
        <PlanFoot plan={plan} />
      </div>
    </OnboardingChrome>
  );
}

function Row({ term, value, changes }: { term: string; value: string; changes?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-vellum-line py-3 last:border-b-0">
      <dt className="text-smoke">{term}</dt>
      <dd key={changes} className={cx("font-medium text-ink tabular-nums", changes && "proto-value-in")}>{value}</dd>
    </div>
  );
}

const WEEKS = [
  [9, 10, 11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20, 21, 22],
  [23, 24, 25, 26, 27, 28, 29],
];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function FreeWeekCalendar({ plan }: { plan: PlanName }) {
  return (
    <PreviewPanel label="Your free week on a calendar">
      <div className="flex max-w-[640px] flex-col gap-5 rounded-tl-sm bg-paper p-8 shadow-e2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-h5 font-semibold text-ink">November</h2>
          <div className="flex items-center gap-4 text-caption text-smoke">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-accent/faint ring-1 ring-accent/40" />Free</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-ink" />First charge</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_NAMES.map((day) => (
            <span key={day} className="pb-1 text-center font-mono text-label uppercase text-smoke">{day}</span>
          ))}
          {WEEKS.flat().map((date) => {
            const past = date < 11;
            const free = date >= 11 && date <= 22;
            const charge = date === 23;
            return (
              <div
                key={date}
                className={cx(
                  "flex h-16 flex-col justify-between rounded-xs p-2 text-small tabular-nums",
                  past && "text-fog",
                  free && "bg-accent/faint text-ink",
                  charge && "bg-ink text-chalk",
                  !past && !free && !charge && "text-smoke",
                )}
              >
                <span className={cx(date === 11 && "font-semibold")}>{date}</span>
                {date === 11 && <span className="text-caption text-accent">Today</span>}
                {date === 22 && <span className="text-caption text-accent">Ends</span>}
                {charge && <span key={plan} className="proto-value-in text-caption">{PLANS[plan].price}</span>}
              </div>
            );
          })}
        </div>
        <p className="text-small text-smoke">
          12 free days, through the Sunday that closes your first full week. Cancel by then and you pay nothing.
        </p>
      </div>
    </PreviewPanel>
  );
}
