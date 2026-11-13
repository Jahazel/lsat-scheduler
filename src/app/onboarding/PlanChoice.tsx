"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { Button } from "@/components/ui/Button";
import { MOTION, cx } from "@/components/ui/classes";
import { callAction } from "@/lib/callAction";
import { PLAN_NAMES, PLAN_TERMS, type PlanChoiceOffer, type PlanChoicePlace, type PlanName } from "@/lib/planChoice";
import { isUnexpectedFailure, type Answer } from "@/lib/unexpectedFailure";
import { PlanShell } from "./PlanShell";

type PlanChoiceProps = {
  place: PlanChoicePlace;
  offer: PlanChoiceOffer;
  cameBackWithoutCard: boolean;
  initialPlan: PlanName;
  openCheckout: (plan: PlanName) => Promise<Answer<{ checkoutUrl: string }>>;
};

export default function PlanChoice({ place, offer, cameBackWithoutCard, initialPlan, openCheckout }: PlanChoiceProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [opening, setOpening] = useState(false);
  const [answer, setAnswer] = useState<Awaited<ReturnType<typeof openCheckout>>>();
  const picked = offer.plans[plan];
  const { freeWeek } = offer;
  const lapsed = place === "weekly_upload";

  useEffect(() => {
    // Back from Stripe can restore this page from the browser's cache with the button still waiting.
    const ready = (event: PageTransitionEvent) => event.persisted && setOpening(false);
    addEventListener("pageshow", ready);
    return () => removeEventListener("pageshow", ready);
  }, []);

  async function addCard() {
    setOpening(true);
    const reply = await callAction(openCheckout)(plan);
    setAnswer(reply);
    if (isUnexpectedFailure(reply)) setOpening(false);
    else if (reply) window.location.assign(reply.checkoutUrl);
  }

  return (
    <>
      <PlanShell
        place={place}
        aside={(
          <StripePreview
            name={picked.name}
            headline={freeWeek ? `Free until ${freeWeek.endsShort}` : `${picked.price} today`}
            then={`Then ${picked.price} ${picked.per} starting ${freeWeek ? freeWeek.firstChargeShort : offer.renews[plan]}`}
            changesWith={plan}
            lapsed={lapsed}
          />
        )}
        actions={(
          <div className="flex flex-col gap-3">
            <p className="text-small text-ink">By continuing, you agree your plan renews {picked.every} until you cancel.</p>
            <Button className="w-full" waiting={opening} waitLabel="Opening Stripe…" onClick={addCard}>
              Add card on Stripe
            </Button>
            <p className="text-center text-caption text-smoke">You add your card on Stripe, then come back here.</p>
          </div>
        )}
      >
        <div className="flex flex-col gap-8">
          {cameBackWithoutCard && (
            <section aria-label="Checkout" className="flex flex-col gap-1 rounded-md bg-vellum p-5">
              <h2 className="text-h6 font-medium text-ink">You didn&rsquo;t add a card.</h2>
              <p className="text-small text-smoke">Pick a plan to continue.</p>
            </section>
          )}
          <div className="flex flex-col gap-2">
            <h1 className="text-h3 font-semibold text-ink">{lapsed ? "Pick a plan" : "Pick your plan"}</h1>
            <p className="text-body text-smoke">
              {lapsed ? (
                "Your weekly schedules are paused. A new plan starts today, and your weekly upload opens right after."
              ) : freeWeek ? (
                <>Your free week runs until <span className="whitespace-nowrap">{freeWeek.endsLong}</span>. You pay nothing before then.</>
              ) : (
                "Your plan starts today. This email already had a free week."
              )}
            </p>
          </div>
          <PlanCards offer={offer} plan={plan} onPick={setPlan} />
          <dl className="flex flex-col border-y border-vellum-line text-small">
            {freeWeek ? (
              <>
                <FactRow term="Today" value="$0" />
                <FactRow term="Free week ends" value={<NoWrap>{freeWeek.endsShort}</NoWrap>} />
                <FactRow
                  term="First charge"
                  value={<><NoWrap>{freeWeek.firstChargeShort}</NoWrap> · <NoWrap>{picked.price}</NoWrap></>}
                  changesWith={plan}
                />
              </>
            ) : (
              <>
                <FactRow term="Today" value={<NoWrap>{picked.price}</NoWrap>} changesWith={plan} />
                <FactRow term="Renews" value={<NoWrap>{offer.renews[plan]}</NoWrap>} changesWith={plan} />
              </>
            )}
          </dl>
          <div className={cx("flex flex-col text-small text-smoke", lapsed ? "gap-4" : "gap-2")}>
            <p>Plus any sales tax. Stripe shows the total before you pay.</p>
            <p>{PLAN_TERMS}</p>
          </div>
        </div>
      </PlanShell>
      <FailureNotice answer={answer} action="open-stripe" />
    </>
  );
}

const NoWrap = ({ children }: { children: ReactNode }) => <span className="whitespace-nowrap">{children}</span>;

function FactRow({ term, value, changesWith }: { term: string; value: ReactNode; changesWith?: PlanName }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-vellum-line py-3 last:border-b-0">
      <dt className="min-w-0 text-smoke">{term}</dt>
      <dd key={changesWith} className={cx("text-right font-medium text-ink tabular-nums", changesWith && "value-in")}>{value}</dd>
    </div>
  );
}

function PlanCards({ offer, plan, onPick }: { offer: PlanChoiceOffer; plan: PlanName; onPick: (plan: PlanName) => void }) {
  return (
    <fieldset className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-3">
      <legend className="sr-only">Plan</legend>
      {PLAN_NAMES.map((name) => {
        const option = offer.plans[name];
        const isPicked = plan === name;
        return (
          <label
            key={name}
            className={cx(
              "relative flex cursor-pointer select-none touch-manipulation flex-col gap-3 rounded-md border bg-paper p-4 [-webkit-tap-highlight-color:transparent] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
              isPicked ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-vellum-line hover:border-fog",
              "transition-[border-color,box-shadow,scale] duration-(--duration-fast) ease-out active:scale-[0.98] motion-reduce:active:scale-100",
            )}
          >
            <input type="radio" name="plan" value={name} checked={isPicked} onChange={() => onPick(name)} className="sr-only" />
            <span className="flex items-center justify-between gap-2">
              <span className="text-small font-medium text-ink">{option.name}</span>
              <span aria-hidden className={cx("flex size-4 shrink-0 items-center justify-center rounded-full border", isPicked ? "border-ink" : "border-fog", MOTION)}>
                <span className={cx(
                  "size-2 rounded-full bg-ink transition-[scale,opacity] duration-(--duration-fast) ease-out motion-reduce:transition-[opacity]",
                  isPicked ? "scale-100 opacity-100" : "scale-50 opacity-0",
                )} />
              </span>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-h4 font-semibold text-ink tabular-nums">{option.price}</span>
              <span className="text-small text-smoke">{option.per}</span>
            </span>
            {option.saving && <span className="text-small text-accent">{option.saving}</span>}
          </label>
        );
      })}
    </fieldset>
  );
}

function StripePreview({ name, headline, then, changesWith, lapsed }: { name: string; headline: string; then: string; changesWith: PlanName; lapsed: boolean }) {
  const label = lapsed
    ? <p className="font-mono text-label uppercase text-smoke">Next · on Stripe</p>
    : <p className="text-small text-smoke">Next · on Stripe</p>;
  const field = cx("h-11 border border-vellum-line", lapsed ? "rounded-xs" : "rounded-sm");
  return (
    <div className="flex flex-col gap-4">
      {lapsed && label}
      <div className={cx("flex flex-col bg-paper p-8", lapsed ? "gap-5 rounded-tl-sm shadow-e2" : "gap-6 rounded-lg shadow-e1")}>
        {!lapsed && label}
        <div className="flex flex-col gap-1">
          <span key={`name-${changesWith}`} className="value-in text-small text-smoke">DrillMap {name}</span>
          <span key={`headline-${changesWith}`} className="value-in text-h4 font-semibold text-ink">{headline}</span>
          <span key={`then-${changesWith}`} className="value-in text-small text-smoke">{then}</span>
        </div>
        <div aria-hidden className="flex flex-col gap-2">
          <span className="h-2 w-20 rounded bg-vellum-line" />
          <span className={field} />
          <span className="h-2 w-28 rounded bg-vellum-line" />
          <span className={field} />
        </div>
        <span aria-hidden className={cx("flex h-11 items-center justify-center text-small text-smoke", lapsed ? "rounded-xs bg-vellum-line" : "rounded-pill bg-vellum")}>Add card</span>
      </div>
      <p className={cx("text-small text-smoke", !lapsed && "px-2")}>
        Stripe hosts this page, so your card number never reaches DrillMap. You come back here when you finish.
      </p>
    </div>
  );
}
