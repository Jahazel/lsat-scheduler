"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { MOTION, cx } from "@/components/ui/classes";
import { PLAN_NAMES, planChoiceOffer, type PlanName } from "@/lib/planChoice";
import { PLAN_PRICES } from "@/lib/planPrices";
import { PLAN_TERMS } from "@/lib/planChoice";
import { Columns } from "./columns";
import type { DataSet, PlanState } from "../view";

// Test data: the real offer builder, on a Monday in the free week, so every date reads as it would in production.
// The worst case uses fake raised prices (5-character amounts, a smaller saving) and a free week across the new year.
const OFFER_INPUT = {
  demo: { prices: PLAN_PRICES, now: new Date("2026-11-16T15:00:00Z"), freeWeekEnds: new Date("2026-11-23T08:00:00Z") },
  worst: { prices: { weeklyCents: 4999, monthlyCents: 14999 }, now: new Date("2026-12-28T15:00:00Z"), freeWeekEnds: new Date("2027-01-04T08:00:00Z") },
};

// Stands in for the server action that creates the Checkout session before the browser leaves for Stripe.
const OPENING_MS = 1200;

function usePlanChoice(state: PlanState, data: DataSet, onPaid: () => void) {
  const [plan, setPlan] = useState<PlanName>("weekly");
  const [opening, setOpening] = useState(false);
  const input = OFFER_INPUT[data === "worst" ? "worst" : "demo"];
  const offer = planChoiceOffer(input.prices, state === "had" ? null : input.freeWeekEnds, input.now);
  const picked = offer.plans[plan];
  const { freeWeek } = offer;
  const facts: { term: string; value: ReactNode; changes?: boolean }[] = freeWeek
    ? [
        { term: "Today", value: "$0" },
        { term: "Free week ends", value: <NoWrap>{freeWeek.endsShort}</NoWrap> },
        { term: "First charge", value: <><NoWrap>{freeWeek.firstChargeShort}</NoWrap> · <NoWrap>{picked.price}</NoWrap></>, changes: true },
      ]
    : [
        { term: "Today", value: <NoWrap>{picked.price}</NoWrap>, changes: true },
        { term: "Renews", value: <NoWrap>{offer.renews[plan]}</NoWrap>, changes: true },
      ];
  return {
    state,
    offer,
    plan,
    setPlan,
    picked,
    facts,
    opening,
    open: () => {
      if (opening) return;
      setOpening(true);
      setTimeout(onPaid, OPENING_MS);
    },
    stripe: {
      name: `DrillMap ${picked.name}`,
      headline: freeWeek ? `Free until ${freeWeek.endsShort}` : `${picked.price} today`,
      then: `Then ${picked.price} ${picked.per} starting ${freeWeek ? freeWeek.firstChargeShort : offer.renews[plan]}`,
    },
  };
}
type Choice = ReturnType<typeof usePlanChoice>;

const NoWrap = ({ children }: { children: ReactNode }) => <span className="whitespace-nowrap">{children}</span>;

function NoCardNote({ choice, className }: { choice: Choice; className?: string }) {
  if (choice.state !== "nocard") return null;
  return (
    <section aria-label="Checkout" className={cx("flex flex-col gap-1", className)}>
      <h2 className="text-h6 font-medium text-ink">You didn&rsquo;t add a card.</h2>
      <p className="text-small text-smoke">Pick a plan to continue.</p>
    </section>
  );
}

function Heading({ choice }: { choice: Choice }) {
  const { freeWeek } = choice.offer;
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-h3 font-semibold text-ink">Pick your plan</h1>
      <p className="text-body text-smoke">
        {freeWeek ? <>Your free week runs until <NoWrap>{freeWeek.endsLong}</NoWrap>. You pay nothing before then.</> : "Your plan starts today. This email already had a free week."}
      </p>
    </div>
  );
}

function Terms() {
  return (
    <div className="flex flex-col gap-2 text-small text-smoke">
      <p>Plus any sales tax. Stripe shows the total before you pay.</p>
      <p>{PLAN_TERMS}</p>
    </div>
  );
}

function Pay({ choice }: { choice: Choice }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-ink">By continuing, you agree your plan renews {choice.picked.every} until you cancel.</p>
      <Button className="w-full" waiting={choice.opening} waitLabel="Opening Stripe…" onClick={choice.open}>Add card on Stripe</Button>
      <p className="text-center text-caption text-smoke">You add your card on Stripe, then come back here.</p>
    </div>
  );
}

function PlanRadio({ choice, name, className, children }: { choice: Choice; name: PlanName; className: (picked: boolean) => string; children: (picked: boolean) => ReactNode }) {
  const picked = choice.plan === name;
  return (
    <label
      className={cx(
        "relative flex cursor-pointer select-none touch-manipulation flex-col [-webkit-tap-highlight-color:transparent] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
        "transition-[border-color,background-color,box-shadow,scale] duration-(--duration-fast) ease-out active:scale-[0.98] motion-reduce:active:scale-100",
        className(picked),
      )}
    >
      <input type="radio" name="plan" value={name} checked={picked} onChange={() => choice.setPlan(name)} className="sr-only" />
      {children(picked)}
    </label>
  );
}

function Price({ choice, name }: { choice: Choice; name: PlanName }) {
  const option = choice.offer.plans[name];
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-h4 font-semibold text-ink tabular-nums">{option.price}</span>
      <span className="text-small text-smoke">{option.per}</span>
    </span>
  );
}

function StripeFields() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <span className="h-2 w-20 rounded bg-vellum-line" />
      <span className="h-11 rounded-sm border border-vellum-line" />
      <span className="h-2 w-28 rounded bg-vellum-line" />
      <span className="h-11 rounded-sm border border-vellum-line" />
    </div>
  );
}

function StripeLines({ choice }: { choice: Choice }) {
  return (
    <div className="flex flex-col gap-1">
      <span key={`n-${choice.plan}`} className="value-in text-small text-smoke">{choice.stripe.name}</span>
      <span key={`h-${choice.plan}`} className="value-in text-h4 font-semibold text-ink">{choice.stripe.headline}</span>
      <span key={`t-${choice.plan}`} className="value-in text-small text-smoke">{choice.stripe.then}</span>
    </div>
  );
}

const STRIPE_NOTE = "Stripe hosts this page, so your card number never reaches DrillMap. You come back here when you finish.";

/* Refined existing: today's cards, rules, and Stripe sketch, in the new frame's soft card on grey. */
export function PlanChoice({ state, data, onPay }: { state: PlanState; data: DataSet; onPay: () => void }) {
  const choice = usePlanChoice(state, data, onPay);
  return (
    <Columns
      main={(
        <div className="flex flex-col gap-8">
          <NoCardNote choice={choice} className="rounded-md bg-vellum p-5" />
          <Heading choice={choice} />
          <fieldset className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-3">
            <legend className="sr-only">Plan</legend>
            {PLAN_NAMES.map((name) => (
              <PlanRadio key={name} choice={choice} name={name} className={(p) => cx("gap-3 rounded-md border bg-paper p-4", p ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-vellum-line hover:border-fog")}>
                {(p) => (
                  <>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-small font-medium text-ink">{choice.offer.plans[name].name}</span>
                      <span aria-hidden className={cx("flex size-4 shrink-0 items-center justify-center rounded-full border", p ? "border-ink" : "border-fog", MOTION)}>
                        <span className={cx("size-2 rounded-full bg-ink transition-[scale,opacity] duration-(--duration-fast) ease-out", p ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
                      </span>
                    </span>
                    <Price choice={choice} name={name} />
                    {choice.offer.plans[name].saving && <span className="text-small text-accent">{choice.offer.plans[name].saving}</span>}
                  </>
                )}
              </PlanRadio>
            ))}
          </fieldset>
          <dl className="flex flex-col border-y border-vellum-line text-small">
            {choice.facts.map((f) => (
              <div key={f.term} className="flex items-baseline justify-between gap-4 border-b border-vellum-line py-3 last:border-b-0">
                <dt className="min-w-0 text-smoke">{f.term}</dt>
                <dd key={f.changes ? choice.plan : undefined} className={cx("text-right font-medium text-ink tabular-nums", f.changes && "value-in")}>{f.value}</dd>
              </div>
            ))}
          </dl>
          <Terms />
        </div>
      )}
      pin="tall"
      actions={<Pay choice={choice} />}
      aside={(
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-6 rounded-lg bg-paper p-8 shadow-e1">
            <p className="text-small text-smoke">Next · on Stripe</p>
            <StripeLines choice={choice} />
            <StripeFields />
            <span aria-hidden className="flex h-11 items-center justify-center rounded-pill bg-vellum text-small text-smoke">Add card</span>
          </div>
          <p className="px-2 text-small text-smoke">{STRIPE_NOTE}</p>
        </div>
      )}
    />
  );
}
