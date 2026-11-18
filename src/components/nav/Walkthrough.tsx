"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { resetEverything, setSimulatedDate } from "@/app/admin/test/actions";
import { FOCUS, cx } from "@/components/ui/classes";
import { callAction } from "@/lib/callAction";
import { UNEXPECTED_FAILURE_MESSAGE, isUnexpectedFailure } from "@/lib/unexpectedFailure";
import {
  calendarMonth, dayName, dayNumber, jumpsFrom, lastPickableMonth, longDay, monthName, monthStart, shiftMonth, shortDate, weekdayShort,
  type WalkthroughFacts,
} from "@/lib/walkthrough";

const PRESS = "transition-[color,background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) active:scale-[0.97] motion-reduce:active:scale-100";
const QUIET = cx("flex h-10 items-center justify-center gap-1.5 rounded-pill border border-vellum-line bg-paper px-4 text-small font-medium whitespace-nowrap text-ink shadow-control pointer-hover:enabled:hover:bg-vellum disabled:cursor-not-allowed disabled:opacity-50", PRESS, FOCUS);
const DANGER = cx("flex h-10 items-center justify-center rounded-pill bg-danger-ink px-[18px] text-small font-medium whitespace-nowrap text-chalk disabled:opacity-60", PRESS, FOCUS);
const ARROW = cx("flex size-10 items-center justify-center rounded-pill text-ink pointer-hover:enabled:hover:bg-vellum disabled:text-fog", PRESS, FOCUS);
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const START_OVER_PATH = "/onboarding";

type Busy = "move" | "start-over" | null;

function useWalkthrough() {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [last, setLast] = useState<Exclude<Busy, null>>("move");
  const [refreshing, startRefresh] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(what: Exclude<Busy, null>, call: () => Promise<unknown>, then: () => void, message: string) {
    setBusy(what);
    setLast(what);
    setNotice(null);
    setFailed(false);
    try {
      if (isUnexpectedFailure(await call())) {
        setFailed(true);
        return;
      }
      setNotice(message);
      startRefresh(then);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return {
    busy: busy ?? (refreshing ? last : null),
    notice,
    failed,
    move: (to: string) => run("move", () => callAction(setSimulatedDate)(to), () => router.refresh(), `Moved to ${dayName(to)}.`),
    startOver: () => run("start-over", () => callAction(resetEverything)(), () => router.push(START_OVER_PATH), "Started over on the real date."),
  };
}
type WalkState = ReturnType<typeof useWalkthrough>;

const Dot = ({ simulated }: { simulated: boolean }) => (
  <span aria-hidden className={cx("size-1.5 shrink-0 rounded-pill", simulated ? "bg-warning-ink" : "bg-fog")} />
);

const Chevron = ({ open, className }: { open: boolean; className?: string }) => (
  <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    className={cx("size-4 shrink-0 transition-transform duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:transition-none", open && "rotate-180", className)}>
    <path d="m6 8 4 4 4-4" />
  </svg>
);

function Status({ w }: { w: WalkState }) {
  const message = w.busy === "move" ? "Moving…" : w.busy === "start-over" ? "Starting over…" : w.failed ? UNEXPECTED_FAILURE_MESSAGE : w.notice;
  return (
    <div role="status" className={cx(!message && "sr-only")}>
      {message && (
        <p key={message} className={cx(
          "walkthrough-drop-in flex items-center gap-2 rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small shadow-control",
          w.busy ? "text-smoke" : w.failed ? "text-danger-ink" : "text-ink",
        )}>
          {message === w.notice && (
            <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-success-ink"><path d="m5 10.5 3 3 7-7" /></svg>
          )}
          {message}
        </p>
      )}
    </div>
  );
}

function Calendar({ facts, w }: { facts: WalkthroughFacts; w: WalkState }) {
  const { today } = facts;
  const [month, setMonth] = useState(() => monthStart(today));
  const [seen, setSeen] = useState(today);
  if (seen !== today) {
    setSeen(today);
    setMonth(monthStart(today));
  }
  const name = monthName(month);
  return (
    <div className="walkthrough-drop-in flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p aria-live="polite" className="text-small font-medium text-ink">{name}</p>
        <div className="-mr-2 flex">
          <button type="button" aria-label="Earlier month" disabled={month <= monthStart(today)} onClick={() => setMonth(shiftMonth(month, -1))} className={ARROW}>
            <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="m12 5-5 5 5 5" /></svg>
          </button>
          <button type="button" aria-label="Later month" disabled={month >= lastPickableMonth(today)} onClick={() => setMonth(shiftMonth(month, 1))} className={ARROW}>
            <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="m8 5 5 5-5 5" /></svg>
          </button>
        </div>
      </div>
      <div role="group" aria-label={name} className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => <span key={day} aria-hidden className="pb-1 text-center text-caption text-smoke">{day}</span>)}
        {calendarMonth(month, today, facts.scheduledWeeks).map((day) => {
          if (day.kind === "outside") return <span key={day.date} aria-hidden />;
          const label = day.kind === "today" ? `${dayName(day.date)}, today` : day.kind === "off" ? `${dayName(day.date)}, not available` : `Move to ${dayName(day.date)}`;
          return (
            <button key={day.date} type="button" disabled={day.kind !== "on" || !!w.busy} aria-current={day.kind === "today" ? "date" : undefined}
              aria-label={day.scheduled ? `${label}, week has a schedule` : label}
              onClick={() => w.move(day.date)}
              className={cx("relative flex h-10 items-center justify-center rounded-md text-small font-medium tabular-nums disabled:cursor-default", PRESS, FOCUS,
                day.kind === "today" ? "bg-ink text-chalk" : day.kind === "off" ? "text-fog" : "text-ink pointer-hover:enabled:hover:bg-vellum")}>
              {dayNumber(day.date)}
              {day.scheduled && day.kind !== "today" && <span aria-hidden className={cx("absolute bottom-1 size-1 rounded-pill", day.kind === "off" ? "bg-fog" : "bg-smoke")} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Jumps({ facts, w }: { facts: WalkthroughFacts; w: WalkState }) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {jumpsFrom(facts.today).map((jump) => (
          <li key={jump.title}>
            <button type="button" disabled={!!w.busy} onClick={() => w.move(jump.to)} aria-label={`${jump.title}: ${jump.detail}`}
              className={cx("flex w-full items-center justify-between gap-3 rounded-md border border-vellum-line bg-paper px-4 py-3 text-left shadow-control pointer-hover:enabled:hover:bg-vellum disabled:opacity-50", PRESS, FOCUS)}>
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
        className={cx("flex w-fit items-center gap-1 rounded-sm py-2 text-small font-medium text-smoke pointer-hover:hover:text-ink", PRESS, FOCUS)}>
        Pick a day <Chevron open={picking} />
      </button>
      {picking && <Calendar facts={facts} w={w} />}
    </div>
  );
}

function StartOver({ w }: { w: WalkState }) {
  const [confirming, setConfirming] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) cancel.current?.focus();
    else if (wasConfirming.current) start.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);
  if (!confirming) return <button ref={start} type="button" disabled={!!w.busy} onClick={() => setConfirming(true)} className={cx(QUIET, "w-fit")}>Start over</button>;
  return (
    <div role="group" aria-label="Start over: confirm" className="walkthrough-drop-in flex flex-col gap-3 rounded-md border border-vellum-line bg-vellum p-4 text-small">
      <dl className="flex flex-col gap-1.5">
        <div><dt className="inline font-medium text-ink">Deletes </dt><dd className="inline text-smoke">all weekly schedules, activity check-ins, analytics snapshots, practice-test results and study settings on your student side.</dd></div>
        <div><dt className="inline font-medium text-ink">Keeps </dt><dd className="inline text-smoke">your admin account.</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button ref={cancel} type="button" onClick={() => setConfirming(false)} disabled={!!w.busy} className={QUIET}>Cancel</button>
        <button type="button" onClick={w.startOver} disabled={!!w.busy} className={DANGER}>{w.busy === "start-over" ? "Starting over…" : "Confirm start over"}</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 border-t border-vellum-line px-4 py-4 sm:px-5">
      <h3 className="text-small font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Card({ id, facts, w, close }: { id: string; facts: WalkthroughFacts; w: WalkState; close: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current?.focus({ preventScroll: true }), []);
  return (
    <div ref={root} id={id} role="region" aria-label="Walkthrough" tabIndex={-1}
      className={cx(
        "menu-pop fixed inset-x-3 top-16 z-50 max-h-[calc(100dvh-10.5rem-env(safe-area-inset-bottom))] origin-top-right overflow-y-auto overscroll-contain rounded-lg border border-vellum-line bg-paper text-left whitespace-normal shadow-e3 outline-none",
        "md:absolute md:inset-x-auto md:top-full md:right-0 md:mt-2 md:max-h-[calc(100dvh-6.5rem)] md:w-[420px]",
      )}>
      <div className="flex flex-col gap-3 p-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className={cx("flex items-center gap-1.5 text-caption", facts.simulated ? "text-warning-ink" : "text-smoke")}>
              <Dot simulated={facts.simulated} />
              {facts.simulated ? `Simulated · real date ${dayName(facts.realDate)}` : "Real date"}
            </p>
            <h2 key={facts.today} className="walkthrough-date-in text-h4 font-semibold text-ink tabular-nums">{longDay(facts.today)}</h2>
          </div>
          <button type="button" aria-label="Close Walkthrough" onClick={close}
            className={cx("-mt-1 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-pill text-smoke pointer-hover:hover:bg-vellum pointer-hover:hover:text-ink", PRESS, FOCUS)}>
            <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-5"><path d="m6 6 8 8M14 6l-8 8" /></svg>
          </button>
        </div>
        <Status w={w} />
      </div>
      <Section title="Move the date">
        <Jumps facts={facts} w={w} />
      </Section>
      <Section title="Start over">
        <p className="-mt-2 text-caption text-smoke">Go back to onboarding on the real date.</p>
        <StartOver w={w} />
      </Section>
    </div>
  );
}

export function Walkthrough({ facts, children }: {
  facts: WalkthroughFacts;
  children: (date: ReactNode) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const w = useWalkthrough();

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const date = (
    <button ref={trigger} type="button" aria-current="true" aria-expanded={open} aria-controls={open ? id : undefined}
      aria-label={`Student side, ${facts.simulated ? "simulated date" : "real date"} ${dayName(facts.today)}. Walkthrough`}
      onClick={() => setOpen(!open)}
      className={cx("relative flex h-8 items-center justify-center gap-1.5 rounded-pill px-3 font-medium whitespace-nowrap text-ink lg:px-4", PRESS, FOCUS)}>
      <Dot simulated={facts.simulated} />
      <span key={facts.today} className="walkthrough-date-in tabular-nums">
        <span className="hidden lg:inline">{weekdayShort(facts.today)}, </span>{shortDate(facts.today)}
      </span>
      <Chevron open={open} className="text-smoke" />
    </button>
  );

  return (
    <div ref={root} className="relative">
      {children(date)}
      {open && <Card id={id} facts={facts} w={w} close={() => { setOpen(false); trigger.current?.focus(); }} />}
    </div>
  );
}
