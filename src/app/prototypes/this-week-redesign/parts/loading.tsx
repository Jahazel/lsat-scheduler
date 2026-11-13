"use client";

import type { ComponentType } from "react";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";

const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";
const DOT = "shrink-0 rounded-pill bg-vellum-line";

// Shapes take the width of realistic words, so lines wrap where the loaded page wraps.
function W({ children, className }: { children: string; className?: string }) {
  return <span className={cx(PLACEHOLDER_SHAPE, className)}>{children}</span>;
}

function Header() {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:pt-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-small text-smoke"><W>Week of November 9</W></p>
          <p className="text-h3 font-semibold text-balance text-ink"><W>Your plan for this week</W></p>
          <p className="text-body text-smoke"><W>Your plan is set. Check off as you go.</W></p>
        </div>
        <div className="flex flex-col gap-1.5">
          {["Sufficient assumption comes first this week. You missed it most on your last practice test.", "Weaken sits out this week in the starred rotation."].map((n) => (
            <p key={n} className="flex gap-2 text-small"><span className={cx(DOT, "mt-0.5 size-4")} /><W>{n}</W></p>
          ))}
        </div>
      </div>
      <div className={cx(CARD, "flex flex-col gap-4 p-5 lg:w-80 lg:shrink-0")}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-baseline gap-1.5"><W className="text-h4 font-semibold">4</W><W className="text-small">of 13 done</W></p>
            <span className={cx(DOT, "h-6 w-20")} />
          </div>
          <span className="h-1.5 rounded-pill bg-vellum-line" />
        </div>
        <div className="flex flex-col gap-2 border-t border-vellum-line pt-4">
          <p className="text-small"><W>9 weeks to the January LSAT</W></p>
          {/* Same boxes as the score curve: curve, tick row, end labels. */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="h-9" />
            <span className="h-1.5" />
            <div className="flex justify-between text-caption"><W>150 now</W><W>goal 165</W></div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Row({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-2 py-1.5">
        <span className={cx(DOT, "size-5")} />
        <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-3">
          <span className="min-w-0 flex-1 text-small"><W>{label}</W></span>
          <span className="text-caption md:text-small"><W>25 min</W></span>
        </span>
      </div>
      {/* The Set up column narrows the label, so phone rows wrap as the loaded ones do. */}
      <span className="flex w-[72px] shrink-0 justify-end text-small"><W>Set up</W></span>
    </div>
  );
}

function Today() {
  return (
    <div className={cx(CARD, "flex flex-col gap-4 p-4 md:p-6")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-baseline gap-2"><W className="text-h5 font-semibold text-ink">Today</W><W className="text-small">Thursday, Nov 12</W></p>
        <W className="text-small">0 of 3 done · 1 h 30 left</W>
      </div>
      <div className="flex flex-col gap-4 rounded-md bg-vellum p-4 md:flex-row md:items-center md:justify-between md:gap-6 md:p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-caption text-smoke"><W>Up next</W></p>
          <p className="text-h5 font-medium"><W>10 Necessary + Sufficient assumption (L2-4)</W></p>
          <p className="text-small"><W>40 min · Logical Reasoning</W></p>
        </div>
        <div className="flex shrink-0 gap-2 *:flex-1 md:*:flex-none">
          <span className={cx(DOT, "h-10 md:w-24")} />
          <span className={cx(DOT, "h-10 md:w-28")} />
        </div>
      </div>
      <div className="flex flex-col">
        <Row label="5 Flaw or descriptive weakening (L2-4)" />
        <Row label="5 Parallel method of reasoning (L2-4)" />
        <Row label="1 RC Passage Science L3" />
      </div>
    </div>
  );
}

const DAYS = [
  { day: "Friday", date: "Nov 13", meta: "Drilling · 1 h 30", rows: ["10 Strengthen + Weaken (L2-4)", "5 Inference (L2-4)", "1 RC Passage Law L3"] },
  { day: "Saturday", date: "Nov 14", meta: "Drilling · 1 h 10", rows: ["5 Must be true (L3-5)", "5 Flaw (L2-4)"] },
];

function Rest() {
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-small font-medium text-smoke"><W>Rest of the week</W></p>
      {DAYS.map((d) => (
        <div key={d.day} className={cx(CARD, "flex flex-col gap-2 p-4 md:p-6")}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
            <p className="flex items-baseline gap-2"><W className="text-h6 font-medium">{d.day}</W><W className="text-small">{d.date}</W></p>
            <W className="text-small">{d.meta}</W>
          </div>
          <div className="flex flex-col">{d.rows.map((r) => <Row key={r} label={r} />)}</div>
        </div>
      ))}
    </div>
  );
}

function Shapes() {
  return (
    <div className="flex flex-col gap-6">
      <Header />
      <Today />
      <Rest />
    </div>
  );
}

/* Section 6 pick (2026-11-12): Live, refined. The live placeholder's word shapes, wait, fade, and sweep, in the new layout. */
function LiveRefined() {
  return <PagePlaceholder><Shapes /></PagePlaceholder>;
}

export const LOADING_VARIANTS: { name: string; Placeholder: ComponentType }[] = [{ name: "Live, refined", Placeholder: LiveRefined }];
