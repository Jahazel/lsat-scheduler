"use client";

import type { ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import { PRESS } from "../chrome";
import { dayName, longDay } from "./model";
import { NamedJumps } from "./moves";
import { Notice, StartOver } from "./parts";
import type { WalkState } from "./useWalk";

const Row = ({ title, children }: { title: string; children: ReactNode }) => (
  <section aria-label={title} className="flex flex-col gap-3 border-t border-vellum-line px-4 py-4 sm:px-5">
    <h3 className="text-small font-semibold text-ink">{title}</h3>
    {children}
  </section>
);

function CloseButton({ close }: { close: () => void }) {
  return (
    <button type="button" aria-label="Close Walkthrough" onClick={close}
      className={cx("flex size-10 shrink-0 items-center justify-center rounded-pill text-smoke pointer-hover:hover:bg-vellum pointer-hover:hover:text-ink", PRESS)}>
      <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-5"><path d="m6 6 8 8M14 6l-8 8" /></svg>
    </button>
  );
}

export function WalkControls({ w, close }: { w: WalkState; close: () => void }) {
  const f = w.facts;
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className={cx("flex items-center gap-1.5 text-caption", f.simulated ? "text-warning-ink" : "text-smoke")}>
              <span aria-hidden className={cx("size-1.5 rounded-pill", f.simulated ? "bg-warning-ink" : "bg-fog")} />
              {f.simulated ? `Simulated · real date ${dayName(f.realDate)}` : "Real date"}
            </p>
            <h2 key={f.today} className="walk-date-in text-h4 font-semibold text-ink tabular-nums">{longDay(f.today)}</h2>
          </div>
          <div className="-mt-1 -mr-2"><CloseButton close={close} /></div>
        </div>
        <Notice w={w} />
      </div>
      <Row title="Move the date">
        <NamedJumps w={w} />
      </Row>
      <Row title="Start over">
        <p className="-mt-2 text-caption text-smoke">Go back to onboarding on the real date.</p>
        <StartOver w={w} />
      </Row>
    </div>
  );
}
