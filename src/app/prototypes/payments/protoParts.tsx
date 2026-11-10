"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { Button } from "@/components/ui/Button";
import type { FailureCode, FormState } from "@/lib/unexpectedFailure";
import { goToScreen } from "./protoContext";
import { cx } from "@/components/ui/classes";
import { STRIPE_NOTE, TERMS, agreementLine } from "./protoData";

export function StepTitle({ title, lead }: { title: string; lead: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-h3 font-semibold text-ink">{title}</h1>
      <p className="text-body text-smoke">{lead}</p>
    </div>
  );
}

/**
 * A button that leaves for a Stripe page: it waits as the server starts the Stripe session, then the Stripe stand-in opens.
 * With `fail`, the server cannot start the session, so the app's failure toast shows and the student stays.
 */
export function useOpenStripe(page: string, fail = false) {
  const [opening, setOpening] = useState(false);
  const [failure, setFailure] = useState<FormState>(null);
  useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(() => {
      setOpening(false);
      if (fail) setFailure({ unexpectedFailure: "7f3a91c2" as FailureCode });
      else goToScreen("stripe", page);
    }, 900);
    return () => clearTimeout(timer);
  }, [opening, page, fail]);
  return { opening, open: () => setOpening(true), failure: <FailureNotice answer={failure} action="open-stripe" /> };
}

export function AddCardButton({ checkout, fail }: { checkout: string; fail?: boolean }) {
  const stripe = useOpenStripe(checkout, fail);
  return (
    <>
      <Button className="w-full" waiting={stripe.opening} waitLabel="Opening Stripe…" onClick={stripe.open}>
        Add card on Stripe
      </Button>
      {stripe.failure}
    </>
  );
}

export function PlanFoot({ every, checkout, fail, className }: { every: string; checkout: string; fail?: boolean; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <p className="text-small text-smoke">{TERMS}</p>
      <div className="flex flex-col gap-3">
        <p className="text-small text-ink">{agreementLine(every)}</p>
        <AddCardButton checkout={checkout} fail={fail} />
        <p className="text-center text-caption text-smoke">{STRIPE_NOTE}</p>
      </div>
    </div>
  );
}

export function PreviewPanel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <aside data-page-section aria-label={label} className="hidden flex-col gap-4 bg-vellum px-8 pt-32 pb-12 lg:flex xl:px-18">
      {children}
    </aside>
  );
}
