"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { cx } from "@/components/ui/classes";
import { useDismiss } from "../chrome";
import { WalkControls } from "./Card";
import { dayName, shortDate, weekdayShort } from "./model";
import type { WalkState } from "./useWalk";


export const dateName = (w: WalkState) => `${w.facts.simulated ? "Simulated date" : "Real date"} ${dayName(w.facts.today)}. Walkthrough`;

export function SwitchDate({ w, open }: { w: WalkState; open: boolean }) {
  const f = w.facts;
  return (
    <>
      <span aria-hidden className={cx("size-1.5 shrink-0 rounded-pill", f.simulated ? "bg-warning-ink" : "bg-fog")} />
      <span key={f.today} className="walk-date-in tabular-nums">
        <span className="hidden lg:inline">{weekdayShort(f.today)}, </span>{shortDate(f.today)}
      </span>
      <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className={cx("size-4 shrink-0 text-smoke transition-transform duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:transition-none", open && "rotate-180")}><path d="m6 8 4 4 4-4" /></svg>
    </>
  );
}

function WalkCard({ w, close }: { w: WalkState; close: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current?.focus({ preventScroll: true }), []);
  return (
    <div ref={root} id="walkthrough" role="region" aria-label="Walkthrough" tabIndex={-1}
      className={cx("menu-pop fixed inset-x-3 top-16 z-50 max-h-[calc(100dvh-10.5rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain rounded-lg border border-vellum-line bg-paper shadow-e3 outline-none",
        "origin-top-right md:absolute md:inset-x-auto md:top-full md:right-0 md:mt-2 md:max-h-[calc(100dvh-6.5rem)] md:w-[420px]")}>
      <WalkControls w={w} close={close} />
    </div>
  );
}

export function Walkthrough({ w, open, setOpen, trigger, children }: { w: WalkState; open: boolean; setOpen: (open: boolean) => void; trigger: RefObject<HTMLButtonElement | null>; children: ReactNode }) {
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const root = useDismiss(open, close);
  return <div ref={root} className="relative">{children}{open && <WalkCard w={w} close={close} />}</div>;
}
