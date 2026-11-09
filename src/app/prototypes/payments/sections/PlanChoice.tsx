"use client";

import { useState, type ReactNode } from "react";
import { MOTION, cx } from "@/components/ui/classes";
import { OnboardingChrome } from "../chrome";
import { plansFor, type PlanName, type ProtoData } from "../protoData";
import { useProtoData } from "../protoContext";
import { PlanFoot, PreviewPanel, StepTitle } from "../protoParts";

export default function PlanChoice() {
  const { prices, freeWeek } = useProtoData();
  const plans = plansFor(prices);
  const [plan, setPlan] = useState<PlanName>("weekly");
  const picked = plans[plan];
  return (
    <OnboardingChrome preview={<StripeNext plan={plan} name={picked.name} price={picked.price} per={picked.per} freeWeek={freeWeek} />}>
      <div className="flex flex-col gap-8">
        <StepTitle title="Pick your plan" lead={<>Your free week runs until <span className="whitespace-nowrap">{freeWeek.endsLong}</span>. You pay nothing before then.</>} />
        <PlanCards plans={plans} plan={plan} onPick={setPlan} />
        <dl className="flex flex-col border-y border-vellum-line text-small">
          <Row term="Today" value="$0" />
          <Row term="Free week ends" value={freeWeek.endsShort} />
          <Row
            term="First charge"
            value={<><span className="whitespace-nowrap">{freeWeek.firstChargeShort}</span> · <span className="whitespace-nowrap">{picked.price}</span></>}
            changes={plan}
          />
        </dl>
        <PlanFoot every={picked.every} />
      </div>
    </OnboardingChrome>
  );

}

function StripeNext({ plan, name, price, per, freeWeek }: { plan: PlanName; name: string; price: string; per: string; freeWeek: ProtoData["freeWeek"] }) {
  return <StripePreview name={name} headline={`Free until ${freeWeek.endsShort}`} then={`Then ${price} ${per} starting ${freeWeek.firstChargeShort}`} changes={plan} />;
}

/** The Stripe Checkout page that comes next, as a quiet sketch: Stripe hosts it, so only its first lines are DrillMap's words. */
export function StripePreview({ name, headline, then, changes }: { name: string; headline: string; then: string; changes: string }) {
  return (
    <PreviewPanel label="What happens next">
      <p className="font-mono text-label uppercase text-smoke">Next · on Stripe</p>
      <div className="flex max-w-[520px] flex-col gap-5 rounded-tl-sm bg-paper p-8 shadow-e2">
        <div className="flex flex-col gap-1">
          <span className="text-small text-smoke">DrillMap {name}</span>
          <span className="text-h4 font-semibold text-ink">{headline}</span>
          <span key={changes} className="proto-value-in text-small text-smoke">{then}</span>
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

export function Row({ term, value, changes }: { term: string; value: ReactNode; changes?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-vellum-line py-3 last:border-b-0">
      <dt className="min-w-0 text-smoke">{term}</dt>
      <dd key={changes} className={cx("text-right font-medium text-ink tabular-nums", changes && "proto-value-in")}>{value}</dd>
    </div>
  );
}

export function PlanCards({ plans, plan, onPick }: { plans: ReturnType<typeof plansFor>; plan: PlanName; onPick: (plan: PlanName) => void }) {
  return (
    <fieldset className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-3">
      <legend className="sr-only">Plan</legend>
      {(Object.keys(plans) as PlanName[]).map((name) => {
        const option = plans[name];
        const isPicked = plan === name;
        return (
          <label
            key={name}
            className={cx(
              "relative flex cursor-pointer flex-col gap-3 rounded-md border bg-paper p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
              isPicked ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-vellum-line hover:border-fog",
              "transition-[border-color,box-shadow,scale] duration-(--duration-fast) ease-out active:scale-[0.98]",
            )}
          >
            <input type="radio" name="plan" value={name} checked={isPicked} onChange={() => onPick(name)} className="sr-only" />
            <span className="flex items-center justify-between gap-2">
              <span className="text-small font-medium text-ink">{option.name}</span>
              <span aria-hidden className={cx("flex size-4 shrink-0 items-center justify-center rounded-full border", isPicked ? "border-ink" : "border-fog", MOTION)}>
                <span className={cx("size-2 rounded-full bg-ink transition-[scale,opacity] duration-(--duration-fast) ease-out", isPicked ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
              </span>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-h4 font-semibold text-ink tabular-nums">{option.price}</span>
              <span className="text-small text-smoke">{option.per}</span>
            </span>
            <span className="min-h-[18px] text-small text-accent">{option.saving}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
