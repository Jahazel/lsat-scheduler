"use client";

import { cx } from "@/components/ui/classes";
import { DAYS, TEST_DATES, hours, type Flow } from "./flow";

type Focus = "goal" | "week" | "drills";

// clip-path, not height: it skips layout and keeps the rounded top at every bar size.
const BAR = "h-full w-full rounded-xs transition-[clip-path] duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none";

function read(flow: Flow) {
  const { values, index, done } = flow;
  const date = TEST_DATES.find((d) => d.label === values.testDate);
  return {
    values,
    date,
    total: DAYS.reduce((sum, d) => sum + values.minutes[d], 0),
    max: Math.max(...DAYS.map((d) => values.minutes[d])),
    showWeek: index >= 1 || done,
    showDrills: index >= 3,
    focus: (done ? null : index === 0 ? "goal" : index === 1 ? "week" : "drills") as Focus | null,
    time: values.testTime === "standard" ? "Standard time" : `${values.testTime}× time`,
  };
}

export function RoadToTest({ flow }: { flow: Flow }) {
  const r = read(flow);
  const { values } = r;
  const weeks = r.date?.weeks ?? 0;
  const W = 400;
  const H = 120;
  const current = Number(values.current) || 0;
  const goal = Number(values.goal) || 0;
  const hasScores = current >= 120 && goal > current;
  const y = (s: number) => H - 16 - ((s - 120) / 60) * (H - 32);
  return (
    <div className="flex flex-col gap-6 rounded-lg bg-paper p-8 shadow-e1">
      <div className="flex flex-col gap-1">
        <p className="text-small text-smoke">Hi {values.firstName} · {r.time.toLowerCase()}</p>
        <p className="text-h3 font-semibold text-ink">{weeks ? `${weeks} weeks to the ${values.testDate} LSAT` : "Your road to test day"}</p>
      </div>
      <div className="flex flex-col gap-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={hasScores ? `From ${current} now to ${goal} by test day` : "Score path appears after your goal"}>
          {Array.from({ length: weeks }, (_, i) => {
            const x = 8 + (i / Math.max(weeks - 1, 1)) * (W - 16);
            return <line key={i} x1={x} x2={x} y1={H - 10} y2={H - 4} className={i === 0 ? "stroke-accent" : "stroke-vellum-line"} strokeWidth={i === 0 ? 3 : 2} strokeLinecap="round" />;
          })}
          {hasScores ? (
            <>
              <path d={`M8 ${y(current)} C ${W * 0.45} ${y(current)}, ${W * 0.55} ${y(goal)}, ${W - 8} ${y(goal)}`} fill="none" className="stroke-accent" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={8} cy={y(current)} r={4} className="fill-paper stroke-accent" strokeWidth={2} />
              <circle cx={W - 8} cy={y(goal)} r={5} className="fill-accent" />
            </>
          ) : (
            <line x1={8} x2={W - 8} y1={H / 2} y2={H / 2} className="stroke-vellum-line" strokeWidth={2} strokeDasharray="4 6" />
          )}
        </svg>
        <div className="flex justify-between text-small">
          <span><span className="font-semibold text-ink tabular-nums">{values.current || "—"}</span> <span className="text-smoke">now</span></span>
          <span><span className="text-smoke">goal</span> <span className="font-semibold text-accent tabular-nums">{values.goal || "—"}</span></span>
        </div>
      </div>
      <div className={cx("flex flex-col gap-3 rounded-md border p-4 transition-colors duration-(--duration-base) ease-out", r.focus === "week" ? "border-accent/40" : "border-vellum-line")}>
        <p className="text-small">
          <span className="font-semibold text-ink">Week 1</span>
          <span className="text-smoke"> · {r.showWeek ? `${hours(r.total)}${values.ptDay ? ` · practice test ${values.ptDay}` : ""}` : "set on the next step"}</span>
        </p>
        <ol className="grid grid-cols-7 gap-2">
          {DAYS.map((d) => {
            const pt = r.showWeek && values.ptDay === d;
            return (
              <li key={d} className="flex flex-col items-center gap-1.5">
                <span className="flex h-12 w-full items-end">
                  <span className={cx(BAR, pt ? "bg-accent" : "bg-vellum-line")} style={{ clipPath: `inset(${48 - (r.showWeek ? Math.max(4, Math.round((values.minutes[d] / r.max) * 48)) : 4)}px 0 0 0 round 2px)` }} />
                </span>
                <span className={cx("text-caption", pt ? "font-medium text-accent" : "text-smoke")}>{d.slice(0, 2)}</span>
              </li>
            );
          })}
        </ol>
        {flow.done ? null : r.showDrills ? (
          <p className="border-t border-vellum-line pt-3 text-small text-smoke"><span className="font-medium text-ink">Monday:</span> {values.drills.map((d) => d.label).join(" · ")}</p>
        ) : (
          <p className="border-t border-vellum-line pt-3 text-small text-fog">Drills fill in after you add analytics.</p>
        )}
      </div>
    </div>
  );
}
