"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ReminderStrip } from "@/components/ui/ReminderStrip";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { cx } from "@/components/ui/classes";
import { AppChrome } from "../../chrome";
import { goToScreen, useProtoData, useProtoState } from "../../protoContext";
import { planNote, weekDates, weekOf, type PlanNote, type ProtoData, type WeekState } from "../../protoData";

const DAYS: { kind: string; minutes: string; rows: string[] }[] = [
  { kind: "Drilling", minutes: "1 h 30 min of 1 h 30 min", rows: ["10 Necessary + Sufficient assumption (L2-4)", "1 RC Passage Science L3"] },
  { kind: "Drilling", minutes: "1 h 30 min of 1 h 30 min", rows: ["5 Flaw or descriptive weakening (L2-4)", "5 Parallel method (L3-5)", "1 Full LR Section"] },
  { kind: "Drilling", minutes: "1 h 30 min of 1 h 30 min", rows: ["10 Strengthen + Weaken (L2-4)", "5 PSA - find the rule (L2-4)", "5 Inference (L2-4)"] },
  { kind: "Rest day", minutes: "0 min of 1 h 30 min", rows: [] },
  { kind: "Practice test", minutes: "3 h 30 min of 1 h 30 min", rows: ["Practice Test (from PT 130+)"] },
  { kind: "Practice-test review", minutes: "1 h 30 min of 1 h 30 min", rows: ["PT Review + Blind Review"] },
  { kind: "Drilling", minutes: "1 h 30 min of 1 h 30 min", rows: ["5 Must be true (L3-5)"] },
];

const TOTAL = DAYS.reduce((sum, day) => sum + day.rows.length, 0);

type Days = "active" | "read-only" | "none";

// Where each state sits in the student's weeks: which Monday, which day is today, and what This week shows below the header.
const WEEKS: Record<WeekState, { week: keyof ProtoData["weeks"]; today: number; days: Days; reminder: boolean }> = {
  "free-friday": { week: "lastFree", today: 4, days: "active", reminder: true },
  "free-sunday": { week: "lastFree", today: 6, days: "active", reminder: true },
  "free-cancelled": { week: "lastFree", today: 4, days: "active", reminder: false },
  "free-saved": { week: "lastFree", today: 5, days: "active", reminder: false },
  held: { week: "firstPaid", today: 0, days: "none", reminder: false },
  retrying: { week: "retrying", today: 1, days: "active", reminder: false },
  "retrying-weekend": { week: "retrying", today: 5, days: "active", reminder: true },
  "lapsed-failed": { week: "firstPaid", today: 0, days: "none", reminder: false },
  "lapsed-ended": { week: "lapsed", today: 2, days: "read-only", reminder: false },
};

export function useWeek() {
  const data = useProtoData();
  const state = (useProtoState() || "free-friday") as WeekState;
  const place = WEEKS[state];
  const monday = data.weeks[place.week];
  const done = DAYS.slice(0, place.today).reduce((sum, day) => sum + day.rows.length, 0);
  const dueSoFar = place.days === "active" ? done + DAYS[place.today].rows.length : undefined;
  return { state, note: planNote(state, data)!, ...place, monday, done, dueSoFar };
}

/** The This week page around a plan note: the note goes above the days, and `empty` replaces the days when none show. */
export function WeekPage({ beforeDays, empty }: { beforeDays?: ReactNode; empty?: ReactNode }) {
  const { monday, today, days, reminder, done, dueSoFar } = useWeek();
  const dates = weekDates(monday);
  return (
    <AppChrome>
      {reminder && (
        <ReminderStrip message="Next week starts Monday. Add your screenshots to build your weekly schedule." href="#" action="Plan next week" />
      )}
      <PageHeader
        eyebrow={`Week of ${weekOf(monday)}`}
        title="Your plan for this week"
        lead={days === "active" ? "Your plan is set. Check off as you go." : undefined}
        notes={days === "none" ? [] : ["Necessary assumption comes first this week. You missed it most on your last practice test."]}
        aside={days === "none" ? undefined : <ProgressBar done={done} total={TOTAL} dueSoFar={dueSoFar} />}
      />
      <div className="flex flex-col gap-4 px-5 pt-8 pb-16 md:px-18 md:pt-16 md:pb-24">
        {beforeDays}
        {days === "none" ? empty : DAYS.map((day, index) => (
          <Card key={index} className={day.rows.length === 0 ? "gap-2" : undefined}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
              <h2 className="flex items-baseline gap-2 text-h6 font-medium text-ink">
                {dates[index].day}{" "}
                <span className={cx("text-small font-regular", index === today ? "text-ink" : "text-smoke")}>
                  {index === today ? `Today, ${dates[index].date}` : dates[index].date}
                </span>
              </h2>
              <span className="text-small text-smoke">{day.kind} · {day.minutes}</span>
            </div>
            {day.rows.length === 0 ? (
              <p className="px-2 text-small text-smoke">Rest day. Nothing planned.</p>
            ) : (
              <ul className="flex flex-col">
                {day.rows.map((row) => {
                  const isDone = index < today;
                  return (
                    <li key={row} className="flex min-h-9 items-start gap-0.5 pr-2">
                      <span className="flex h-9 w-8 shrink-0 items-center justify-center">
                        <StatusIcon name={isDone ? "check-disc" : "open-circle"} />
                      </span>
                      <span className={cx("min-w-0 flex-1 py-[9px] text-small", isDone ? "text-smoke line-through decoration-fog" : "text-ink")}>{row}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </AppChrome>
  );
}

export function NoteGlyph({ tone, className }: { tone: PlanNote["tone"]; className?: string }) {
  return tone === "warning" ? (
    <svg aria-hidden viewBox="0 0 24 24" className={cx("size-[18px] shrink-0 text-warning-ink", className)} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
    </svg>
  ) : (
    <svg aria-hidden viewBox="0 0 24 24" className={cx("size-[18px] shrink-0 text-smoke", className)} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

/** "Update card" opens the Stripe Customer Portal; "Pick a plan" follows the flow map to plan choice. */
export function NoteAction({ action }: { action: NonNullable<PlanNote["action"]> }) {
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(() => setOpening(false), 1600);
    return () => clearTimeout(timer);
  }, [opening]);
  if (action === "pick-plan") return <Button size="md" onClick={() => goToScreen("plan-choice")}>Pick a plan</Button>;
  return <Button size="md" variant="outline" waiting={opening} waitLabel="Opening Stripe…" onClick={() => setOpening(true)}>Update card</Button>;
}
