"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChangePasswordCard } from "@/app/account/ChangePasswordCard";
import { DeletionCard } from "@/app/account/DeletionCard";
import { SessionsCard } from "@/app/account/SessionsCard";
import { Button } from "@/components/ui/Button";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { AppChrome } from "../../chrome";
import { goToScreen, useProtoData, useProtoState } from "../../protoContext";
import { planCardFacts, type PlanCardFacts, type PlanCardState } from "../../protoData";

export function usePlanCard() {
  const data = useProtoData();
  const state = (useProtoState() || "free-week") as PlanCardState;
  return planCardFacts(state, data);
}

/** The Account page with the real cards below the Plan card; their buttons call server actions the prototype has no session for. */
export function AccountPage({ planCard }: { planCard: ReactNode }) {
  return (
    <AppChrome tab={null}>
      <div className="min-h-full bg-vellum">
        <header className="border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-18 md:pt-12 md:pb-10">
          <div className="mx-auto flex max-w-content flex-col gap-3">
            <h1 className="text-h3 font-semibold text-ink md:text-h2">Account</h1>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body text-ink md:text-lead">maya.rodriguez@example.com</p>
              <span className="flex h-7 items-center rounded-pill border border-vellum-line px-3 text-small text-smoke">Password sign-in</span>
            </div>
          </div>
        </header>
        <div className="mx-auto box-content flex max-w-content flex-col gap-6 px-5 py-10 md:px-18 md:pt-16 md:pb-24">
          {planCard}
          <SessionsCard />
          <ChangePasswordCard />
          <DeletionCard mode={{ kind: "password" }} />
        </div>
      </div>
    </AppChrome>
  );
}

export function StatusChip({ facts, className }: { facts: PlanCardFacts; className?: string }) {
  return (
    <span
      className={cx(
        "flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 text-small",
        facts.tone === "warning" ? "border-warning-line bg-warning-wash text-warning-ink" : "border-vellum-line text-smoke",
        className,
      )}
    >
      {facts.status}
    </span>
  );
}

// The Account page's own button look, as on the Sessions card.
const BUTTON = cx("flex h-11 shrink-0 items-center justify-center rounded-sm px-5 text-body leading-[20px] font-medium", MOTION, FOCUS);

/** "Manage plan on Stripe" opens the Customer Portal; "Pick a plan" follows the flow map to plan choice. */
export function PlanCardAction({ facts, className }: { facts: PlanCardFacts; className?: string }) {
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(() => setOpening(false), 1600);
    return () => clearTimeout(timer);
  }, [opening]);
  if (facts.action === "pick") {
    return <Button variant="bare" className={cx(BUTTON, "bg-ink text-chalk hover:bg-graphite-raised", className)} onClick={() => goToScreen("plan-choice")}>Pick a plan</Button>;
  }
  return (
    <Button variant="bare" className={cx(BUTTON, "border border-vellum-line bg-paper text-ink hover:bg-vellum", className)} waiting={opening} waitLabel="Opening Stripe…" onClick={() => setOpening(true)}>
      Manage plan on Stripe
    </Button>
  );
}
