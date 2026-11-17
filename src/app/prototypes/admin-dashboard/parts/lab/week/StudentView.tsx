"use client";

import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { cx } from "@/components/ui/classes";
import { CARD } from "../../students/controls";
import { shortDay } from "../model";
import { ChainButtons, REASON_NAME, WeekSwap, chainPlace, weekReasons } from "./chain";
import type { Lab } from "../parts";

export function StudentViewTitle({ lab, go }: { lab: Lab; go: (to: number) => void }) {
  const place = chainPlace(lab);
  if (!place) return <h2 className="text-h4 font-semibold text-ink">No week yet</h2>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <h2 className="text-h4 font-semibold text-ink">Week {place.week.number} <span className="font-regular text-smoke">· {shortDay(place.week.weekOf)}</span></h2>
      <ChainButtons lab={lab} go={go} />
    </div>
  );
}

export function StudentViewWeek({ lab, dir }: { lab: Lab; dir: "next" | "earlier" | null }) {
  const place = chainPlace(lab);
  if (!place) return <p className="text-small text-smoke">No week yet.</p>;
  const { week, stop } = place;
  const reasons = weekReasons(week.schedule);
  return (
    <WeekSwap lab={lab} dir={dir} className="flex flex-col gap-4">
      <section aria-label="Schedule reasons" className={cx(CARD, "flex flex-col gap-3 px-4 py-4 sm:px-5")}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-small font-medium text-ink">Schedule reasons</h3>
          <span className="min-w-0 text-caption [overflow-wrap:anywhere] text-smoke">Planned from {week.analytics}</span>
        </div>
        {reasons.length === 0
          ? <p className="text-small text-smoke">No week reasons. Day reasons sit on their day below.</p>
          : <ul className="flex flex-col gap-2">
              {reasons.map((r, i) => (
                <li key={`${r.code}-${i}`} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="shrink-0 text-small font-medium text-ink sm:w-40">{REASON_NAME[r.code]}</span>
                  <span className="text-small text-smoke">{r.sentence}</span>
                </li>
              ))}
            </ul>}
        {stop && <p className="border-t border-vellum-line pt-3 text-caption text-smoke">Last week in the chain. {stop}</p>}
      </section>
      <ScheduleCheckInView key={JSON.stringify(week.schedule.days)} scheduleId="lab" schedule={week.schedule} student={week.student} checkIns={[]} readOnly header={<></>} padding="pt-0" />
    </WeekSwap>
  );
}
