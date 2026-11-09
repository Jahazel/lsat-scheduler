"use client";

import { cx } from "@/components/ui/classes";
import { AccountPage, PlanCardAction, StatusChip, usePlanCard } from "./account";

export default function DateTile() {
  const facts = usePlanCard();
  const warn = facts.tone === "warning";
  return (
    <AccountPage
      planCard={
        <section aria-label="Plan" className="flex flex-col gap-6 rounded-md border border-vellum-line bg-paper p-5 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h4 font-semibold text-ink">Plan</h2>
            <StatusChip facts={facts} />
          </div>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-16">
            <div className="flex min-w-0 items-center gap-5">
              {facts.next ? <Tile date={facts.next.date} warn={warn} /> : null}
              <div className="flex min-w-0 flex-col gap-1">
                {facts.next ? (
                  <>
                    <p className="text-small text-smoke">{facts.next.label}</p>
                    <p className={cx("text-h5 font-medium", warn ? "text-warning-ink" : "text-ink")}>{facts.next.date}</p>
                    <p className="text-small text-smoke">
                      {facts.plan && <span className="font-medium text-ink">{facts.plan.name} · <span className="whitespace-nowrap">{facts.plan.price} {facts.plan.per}</span></span>}
                      {facts.next.after && <> · {facts.next.after}</>}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-h5 font-medium text-ink">No plan</p>
                    <p className="text-small text-smoke">{facts.detail}</p>
                  </>
                )}
              </div>
            </div>
            <PlanCardAction facts={facts} />
          </div>
        </section>
      }
    />
  );
}

function Tile({ date, warn }: { date: string; warn: boolean }) {
  const [weekday, month, day] = date.replace(",", "").split(" ");
  return (
    <span
      aria-hidden
      className={cx(
        "flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-sm border text-center",
        warn ? "border-warning-line" : "border-vellum-line",
      )}
    >
      <span className={cx("w-full py-1 font-mono text-label uppercase", warn ? "bg-warning-wash text-warning-ink" : "bg-vellum text-smoke")}>{month}</span>
      <span className="pt-1 text-h4 leading-none font-semibold text-ink tabular-nums">{day}</span>
      <span className="pb-1.5 text-caption text-smoke">{weekday}</span>
    </span>
  );
}
