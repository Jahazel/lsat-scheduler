"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ActionForm } from "@/components/FailureNotice";
import { Button } from "@/components/ui/Button";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import type { PlanCardFacts } from "@/lib/planCard";
import { openCustomerPortal } from "./actions";

const BUTTON = cx("flex h-11 w-full shrink-0 items-center justify-center rounded-sm px-5 text-body leading-[20px] font-medium", MOTION, FOCUS);

export function PlanCard({ facts }: { facts: PlanCardFacts }) {
  return (
    <section data-page-section aria-label="Plan" className="flex flex-col gap-8 rounded-md border border-vellum-line bg-paper p-5 md:flex-row md:justify-between md:gap-16 md:p-8">
      <div className="flex max-w-[560px] grow flex-col gap-4 md:shrink-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h4 font-semibold text-ink">Plan</h2>
          <span
            className={cx(
              "flex h-7 shrink-0 items-center whitespace-nowrap rounded-pill border px-3 text-small",
              facts.tone === "warning" ? "border-warning-line bg-warning-wash text-warning-ink" : "border-vellum-line text-smoke",
            )}
          >
            {facts.status}
          </span>
        </div>
        <dl className="border-t border-vellum-line text-body">
          <Row wrap term="Plan" value={facts.plan ? <>{facts.plan.name} · <span className="whitespace-nowrap">{facts.plan.price} {facts.plan.per}</span></> : "No plan"} />
          {facts.nextDate && <Row term={facts.nextDate.label} value={facts.nextDate.date} warn={facts.tone === "warning"} />}
          {!facts.plan && <Row term="Weekly schedules" value="Paused" />}
        </dl>
        {facts.note && <p className="text-small text-smoke">{facts.note}</p>}
      </div>
      <div className="flex min-w-0 flex-col justify-end md:w-[360px]">
        {facts.action === "pick" ? (
          <Link href="/dashboard/upload" className={cx(BUTTON, "bg-ink text-chalk hover:bg-graphite-raised")}>Pick a plan</Link>
        ) : (
          <ActionForm action={openCustomerPortal}>
            <ManageButton />
          </ActionForm>
        )}
      </div>
    </section>
  );
}

function ManageButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="bare" waiting={pending} waitLabel="Opening Stripe…" className={cx(BUTTON, "border border-vellum-line bg-paper text-ink hover:bg-vellum")}>
      Manage plan on Stripe
    </Button>
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
