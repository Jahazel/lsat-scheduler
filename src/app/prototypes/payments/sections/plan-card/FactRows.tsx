"use client";

import type { ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import { AccountPage, PlanCardAction, StatusChip, usePlanCard } from "./account";

export default function FactRows() {
  const facts = usePlanCard();
  return (
    <AccountPage
      planCard={
        <section aria-label="Plan" className="flex flex-col gap-8 rounded-md border border-vellum-line bg-paper p-5 md:flex-row md:justify-between md:gap-16 md:p-8">
          <div className="flex max-w-[560px] grow flex-col gap-4 md:shrink-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h4 font-semibold text-ink">Plan</h2>
              <StatusChip facts={facts} />
            </div>
            <dl className="border-t border-vellum-line text-body">
              <Row wrap term="Plan" value={facts.plan ? <>{facts.plan.name} · <span className="whitespace-nowrap">{facts.plan.price} {facts.plan.per}</span></> : "No plan"} />
              {facts.next ? (
                <Row term={facts.next.label} value={facts.next.date} warn={facts.tone === "warning"} />
              ) : (
                <Row term="Weekly schedules" value="Paused" />
              )}
            </dl>
            {facts.detail ? <p className="text-small text-smoke">{facts.detail}</p> : null}
          </div>
          <div className="flex min-w-0 flex-col justify-end md:w-[360px]">
            <PlanCardAction facts={facts} className="w-full" />
          </div>
        </section>
      }
    />
  );
}

function Row({ term, value, warn = false, wrap = false }: { term: string; value: ReactNode; warn?: boolean; wrap?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-vellum-line py-3">
      <dt className="min-w-0 text-smoke">{term}</dt>
      <dd className={cx("text-right font-medium tabular-nums", wrap ? "min-w-0" : "whitespace-nowrap", warn ? "text-warning-ink" : "text-ink")}>{value}</dd>
    </div>
  );
}
