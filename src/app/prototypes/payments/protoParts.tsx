"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
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

export function AddCardButton() {
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(() => setOpening(false), 1600);
    return () => clearTimeout(timer);
  }, [opening]);
  return (
    <Button className="w-full" waiting={opening} waitLabel="Opening Stripe…" onClick={() => setOpening(true)}>
      Add card on Stripe
    </Button>
  );
}

export function PlanFoot({ every, className }: { every: string; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <p className="text-small text-smoke">{TERMS}</p>
      <div className="flex flex-col gap-3">
        <p className="text-small text-ink">{agreementLine(every)}</p>
        <AddCardButton />
        <p className="text-center text-caption text-smoke">{STRIPE_NOTE}</p>
      </div>
    </div>
  );
}

export function PreviewPanel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <aside aria-label={label} className="hidden flex-col gap-4 bg-vellum px-8 pt-32 pb-12 lg:flex xl:px-18">
      {children}
    </aside>
  );
}
