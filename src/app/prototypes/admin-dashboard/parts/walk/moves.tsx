"use client";

import { useState } from "react";
import { cx } from "@/components/ui/classes";
import { PRESS } from "../chrome";
import { addDays, dayEvent, dayName, nextWeekday, shortDate } from "./model";
import { Calendar } from "./parts";
import type { WalkState } from "./useWalk";

const Chevron = ({ open }: { open: boolean }) => (
  <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    className={cx("size-4 transition-transform duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:transition-none", open && "rotate-180")}><path d="m6 8 4 4 4-4" /></svg>
);

export function NamedJumps({ w }: { w: WalkState }) {
  const [picking, setPicking] = useState(false);
  const today = w.facts.today;
  const tomorrow = addDays(today, 1);
  const jumps = [
    { to: tomorrow, title: "Next day", detail: [dayName(tomorrow), dayEvent(tomorrow)].filter(Boolean).join(" · ") },
    { to: nextWeekday(today, 5), title: "Saturday", detail: `Weekly upload opens · ${shortDate(nextWeekday(today, 5))}` },
    { to: nextWeekday(today, 0), title: "Monday", detail: `New week starts · ${shortDate(nextWeekday(today, 0))}` },
  ].filter((jump, i) => i === 0 || jump.to !== tomorrow);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {jumps.map((jump) => (
          <li key={jump.title}>
            <button type="button" disabled={!!w.busy} onClick={() => w.move(jump.to)} aria-label={`${jump.title}: ${jump.detail}`}
              className={cx("flex w-full items-center justify-between gap-3 rounded-md border border-vellum-line bg-paper px-4 py-3 text-left shadow-control pointer-hover:enabled:hover:bg-vellum disabled:opacity-50", PRESS)}>
              <span className="flex min-w-0 flex-col">
                <span className="text-small font-medium text-ink">{jump.title}</span>
                <span className="text-caption text-smoke">{jump.detail}</span>
              </span>
              <span aria-hidden className="text-smoke">→</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" aria-expanded={picking} onClick={() => setPicking(!picking)}
        className={cx("flex w-fit items-center gap-1 py-2 text-small font-medium text-smoke pointer-hover:hover:text-ink", PRESS)}>
        Pick a day <Chevron open={picking} />
      </button>
      {picking && <div className="walk-confirm-in"><Calendar w={w} /></div>}
    </div>
  );
}
