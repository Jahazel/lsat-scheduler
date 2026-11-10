"use client";

import { Button } from "@/components/ui/Button";
import { FOCUS, cx } from "@/components/ui/classes";
import { goToScreen, useProtoData, useProtoState } from "../../protoContext";
import { plansFor } from "../../protoData";

// Where each Stripe page sends the student back to: after adding a card, and after closing Checkout or tapping back.
const RETURNS = {
  "checkout-new": { added: ["starting", "waiting"], back: ["plan-choice", "no-card"] },
  "checkout-had-free-week": { added: ["starting", "waiting"], back: ["plan-choice", "no-card"] },
  "checkout-lapsed": { added: ["starting", "lapsed-waiting"], back: ["restart", "no-card"] },
} as const;

/** A plain stand-in for the pages Stripe hosts. They are out of scope: only their colors and logo can change. */
export default function StripeStandIn() {
  const data = useProtoData();
  const page = useProtoState() || "checkout-new";
  const plan = plansFor(data.prices)[data.plan];
  const freeWeek = page === "checkout-new";
  const go = (to: "added" | "back") => {
    const [screen, state] = RETURNS[page as keyof typeof RETURNS][to];
    goToScreen(screen, state);
  };
  return (
    <div className="flex min-h-full flex-col items-center gap-6 bg-vellum px-5 py-12 md:py-20">
      <p className="font-mono text-label uppercase text-smoke">Stand-in · Stripe hosts this page</p>
      <div className="flex w-full max-w-[420px] flex-col gap-6 rounded-md border border-vellum-line bg-paper p-6 md:p-8">
        {page === "portal" ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-small text-smoke">DrillMap</span>
              <h1 className="text-h4 font-semibold text-ink">Manage your plan</h1>
              <span className="text-small text-smoke">Update your card, switch plans, or cancel.</span>
            </div>
            <Button variant="outline" onClick={() => goToScreen("plan-card", "free-week")}>Return to DrillMap</Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-small text-smoke">DrillMap {plan.name}</span>
              <h1 className="text-h4 font-semibold text-ink">{freeWeek ? `Free until ${data.freeWeek.endsShort}` : `${plan.price} today`}</h1>
            </div>
            <Button onClick={() => go("added")}>Add card</Button>
            <button
              type="button"
              className={cx("self-center rounded-xs text-small font-medium text-smoke hover:text-ink", FOCUS)}
              onClick={() => go("back")}
            >
              ← Back to DrillMap
            </button>
          </>
        )}
      </div>
    </div>
  );
}
