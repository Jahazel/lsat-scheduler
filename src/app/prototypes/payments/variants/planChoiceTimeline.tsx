"use client";

import { useState } from "react";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { cx } from "@/components/ui/classes";
import { OnboardingChrome } from "../chrome";
import { FREE_WEEK, PLANS, PROTO_PRICES, type PlanName } from "../protoData";
import { PlanFoot, PreviewPanel, StepTitle } from "../protoParts";

const OPTIONS = [
  { value: "weekly", label: `Weekly · ${PROTO_PRICES.weekly}` },
  { value: "monthly", label: `Monthly · ${PROTO_PRICES.monthly}` },
] as const;

export default function PlanChoiceTimeline() {
  const [plan, setPlan] = useState<PlanName>("weekly");
  const option = PLANS[plan];
  const steps = [
    { when: `Today, ${FREE_WEEK.today}`, what: "Your free week starts", detail: "Stripe saves your card. You are not charged.", now: true },
    { when: FREE_WEEK.endsShort, what: "Your free week ends", detail: "Cancel before the end of this day and you pay nothing." },
    { when: FREE_WEEK.firstChargeShort, what: `First charge: ${option.price}`, detail: `${option.renewsLine} until you cancel.` },
  ];
  return (
    <OnboardingChrome preview={<StripeNext plan={plan} />}>
      <div className="flex flex-col gap-8">
        <StepTitle title="Pick your plan" lead="Both plans get the same weekly schedules." />
        <div className="flex flex-col gap-2">
          <SegmentedSwitch name="plan" label="Plan" options={OPTIONS} value={plan} onChange={setPlan} />
          <p className="h-[18px] text-small text-accent">{plan === "monthly" ? `${PROTO_PRICES.monthlySaving} than Weekly` : ""}</p>
        </div>
        <ol className="flex flex-col">
          {steps.map((step, index) => (
            <li key={step.what.split(":")[0]} className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-4">
              <span className="flex flex-col items-center">
                <span className={cx("mt-1 size-3 shrink-0 rounded-full border-2", step.now ? "border-ink bg-ink" : "border-ink bg-paper")} />
                {index < steps.length - 1 && <span className="w-px flex-1 bg-vellum-line" />}
              </span>
              <div className={cx("flex flex-col gap-0.5", index < steps.length - 1 && "pb-6")}>
                <span className="font-mono text-label uppercase text-smoke">{step.when}</span>
                <span key={step.what} className="proto-value-in text-body font-medium text-ink tabular-nums">{step.what}</span>
                <span className="text-small text-smoke">{step.detail}</span>
              </div>
            </li>
          ))}
        </ol>
        <PlanFoot plan={plan} />
      </div>
    </OnboardingChrome>
  );
}

function StripeNext({ plan }: { plan: PlanName }) {
  return (
    <PreviewPanel label="What happens next">
      <p className="font-mono text-label uppercase text-smoke">Next · on Stripe</p>
      <div className="flex max-w-[520px] flex-col gap-5 rounded-tl-sm bg-paper p-8 shadow-e2">
        <div className="flex flex-col gap-1">
          <span className="text-small text-smoke">DrillMap {PLANS[plan].name}</span>
          <span className="text-h4 font-semibold text-ink">Free until {FREE_WEEK.endsShort}</span>
          <span key={plan} className="proto-value-in text-small text-smoke">Then {PLANS[plan].price} {PLANS[plan].per} starting {FREE_WEEK.firstChargeShort}</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="h-2 w-20 rounded bg-vellum-line" />
          <span className="h-11 rounded-xs border border-vellum-line" />
          <span className="h-2 w-28 rounded bg-vellum-line" />
          <span className="h-11 rounded-xs border border-vellum-line" />
        </div>
        <span className="flex h-11 items-center justify-center rounded-xs bg-vellum-line text-small text-smoke">Add card</span>
      </div>
      <p className="max-w-[520px] text-small text-smoke">
        Stripe hosts this page, so your card number never reaches DrillMap. You come back here when you finish.
      </p>
    </PreviewPanel>
  );
}
