"use client";

import { cx } from "@/components/ui/classes";
import { AccountPage, PlanCardAction, usePlanCard } from "./account";

export default function RowCard() {
  const facts = usePlanCard();
  return (
    <AccountPage
      planCard={
        <section aria-label="Plan" className="flex flex-col gap-6 rounded-md border border-vellum-line bg-paper p-5 md:flex-row md:items-center md:justify-between md:gap-16 md:p-8">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="text-h4 font-semibold text-ink">Plan</h2>
            <p className="text-body font-medium text-ink">{facts.plan ? `${facts.plan.name} · ${facts.plan.price} ${facts.plan.per}` : "No plan"}</p>
            <p className={cx("text-body", facts.tone === "warning" && facts.plan ? "text-warning-ink" : "text-smoke")}>{facts.detail}</p>
          </div>
          <PlanCardAction facts={facts} className="md:self-center" />
        </section>
      }
    />
  );
}
