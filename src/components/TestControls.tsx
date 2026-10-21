"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import { useRouter } from "next/navigation";
import {
  setSimulatedDate,
  generateTestSample,
  rebuildThisWeek,
  resetTestData,
  resetEverything,
} from "@/app/admin/test/actions";
import { useAdminTest } from "./AdminTestContext";
import { FOCUS, cx } from "./nav/shared";
import { isoDateInWeek } from "@/lib/scheduleReasonText";
import type { SampleDirection } from "@/lib/sampleAnalytics";

export interface TestControlState {
  date: string;
  realDate: string;
  weekStartDate: string;
  simulated: boolean;
  onboarded: boolean;
  canRebuild: boolean;
}

const BUTTON = cx(
  "min-h-11 rounded-sm border border-vellum-line px-3 py-2 text-small font-medium text-ink hover:bg-vellum disabled:cursor-not-allowed disabled:opacity-50",
  FOCUS,
);
const RESETS = [
  {
    key: "rebuild",
    requiresSchedule: true, returnsToRealDate: false, destination: "/dashboard", confirmLabel: "Confirm rebuild",
    label: "Rebuild this week",
    detail: "Recreate this week from your current settings and analytics.",
    deletes: "this week's weekly schedule and activity check-ins",
    keeps:
      "your simulated date, analytics snapshots, study settings and earlier weeks",
    action: rebuildThisWeek,
  },
  {
    key: "data",
    requiresSchedule: false, returnsToRealDate: true, destination: "/dashboard", confirmLabel: "Confirm reset",
    label: "Reset test data",
    detail: "Start again on the real date, keeping study settings.",
    deletes:
      "all weekly schedules, activity check-ins and analytics snapshots on your student side",
    keeps: "your study settings and admin account",
    action: resetTestData,
  },
  {
    key: "everything",
    requiresSchedule: false, returnsToRealDate: true, destination: "/onboarding", confirmLabel: "Confirm reset",
    label: "Reset everything",
    detail: "Return to onboarding on the real date.",
    deletes:
      "all weekly schedules, activity check-ins, analytics snapshots and study settings on your student side",
    keeps: "your admin account",
    action: resetEverything,
  },
] as const;

export function displaySimulatedDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export default function TestControls({
  state,
  onClose,
  closeRef,
  closeExpanded,
}: {
  state: TestControlState;
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
  closeExpanded?: boolean;
}) {
  const router = useRouter();
  const { setSample, currentWeek, setCurrentWeek } = useAdminTest();
  const canRebuild =
    currentWeek?.week === state.weekStartDate
      ? currentWeek.exists
      : state.canRebuild;
  const id = useId();
  const [date, setDate] = useState("");
  const [direction, setDirection] = useState<SampleDirection>("steady");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const resetButtons = useRef(new Map<string, HTMLButtonElement>());
  const lastConfirmation = useRef<string | null>(null);
  // A confirmation replaces its reset button, and closing it removes the
  // focused button. Move focus to the button that takes its place.
  useEffect(() => {
    const previous = lastConfirmation.current;
    lastConfirmation.current = confirmation;
    if (confirmation) cancelButton.current?.focus();
    else if (previous && document.activeElement === document.body) {
      resetButtons.current.get(previous)?.focus();
    }
  }, [confirmation]);

  async function run(action: () => Promise<void>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setConfirmation(null);
      setNotice(message);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update test data. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function move(next: string) {
    return run(
      async () => {
        await setSimulatedDate(next);
        setSample(null);
      },
      `Moved to ${displaySimulatedDate(next)}.`,
    );
  }

  return (
    <div className="text-ink">
      <div className="flex items-start justify-between gap-3 px-5 py-5">
        <div>
          <h2 className="font-semibold">Test controls</h2>
          <p className="mt-3 text-small text-smoke">
            {state.simulated ? "Simulated date" : "Using the real date"}
          </p>
          <p className="mt-1 text-lead font-semibold tabular-nums">
            {displaySimulatedDate(state.date)}
          </p>
          <p className="mt-1 text-small text-smoke">
            Real date {displaySimulatedDate(state.realDate)}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={BUTTON}
          aria-label="Close test controls"
          aria-expanded={closeExpanded}
        >
          Close
        </button>
      </div>
      <fieldset disabled={busy} className="min-w-0">
        <section className="border-t border-vellum-line px-5 py-5">
          <h3 className="text-small font-semibold">
            Week of {displaySimulatedDate(state.weekStartDate)}
          </h3>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day, index) => {
              const target = isoDateInWeek(state.weekStartDate, index);
              const dayNumber = Number(target.slice(-2));
              const status = target < state.date ? "Past" : target === state.date ? "Today" : "";
              return (
                <button
                  key={day}
                  type="button"
                  disabled={target <= state.date}
                  aria-label={status
                    ? `${day} ${dayNumber} ${status}, ${displaySimulatedDate(target)}`
                    : `${day} ${dayNumber}, move to ${displaySimulatedDate(target)}`}
                  aria-current={target === state.date ? "date" : undefined}
                  onClick={() => move(target)}
                  className={cx(
                    "min-h-12 rounded-sm py-2 text-caption tabular-nums enabled:hover:bg-vellum-line disabled:cursor-not-allowed",
                    // Today is not a move target, but it stays at full strength.
                    target === state.date
                      ? "bg-ink text-chalk"
                      : "text-ink disabled:opacity-50",
                    FOCUS,
                  )}
                >
                  <span className="block">{day}</span>
                  <span className="mt-1 block text-small">{dayNumber}</span>
                  <span className="mt-1 block h-4 text-caption">{status}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={cx(BUTTON, "mt-3 w-full")}
            onClick={() => move(isoDateInWeek(state.weekStartDate, 7))}
          >
            Next Monday
          </button>
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void move(date);
            }}
          >
            <label htmlFor={`${id}-date`} className="text-small font-medium">
              Move to a later date
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id={`${id}-date`}
                type="date"
                required
                min={isoDateInWeek(state.date, 1)}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={cx(
                  "min-w-0 flex-1 rounded-sm border border-vellum-line bg-paper px-2 py-2 text-small",
                  FOCUS,
                )}
              />
              <button className={BUTTON} disabled={!date || date <= state.date}>
                Move
              </button>
            </div>
          </form>
          <p className="mt-3 text-caption  text-smoke">
            Dates only move forward. Reset test data returns you to the real
            date.
          </p>
        </section>
        <section className="border-t border-vellum-line px-5 py-5">
          <h3 className="text-small font-semibold">Sample analytics</h3>
          {state.onboarded ? (
            <>
              <p className="mt-2 text-small leading-body text-smoke">
                Generate values, then review and edit them before approving.
              </p>
              <fieldset className="mt-3">
                <legend className="sr-only">Sample direction</legend>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                  {(["improving", "steady", "slipping"] as const).map(
                    (value) => (
                      <label
                        key={value}
                        className="flex min-h-11 items-center gap-1.5 text-small"
                      >
                        <input
                          type="radio"
                          name={`${id}-direction`}
                          value={value}
                          checked={direction === value}
                          onChange={() => setDirection(value)}
                          className="accent-accent"
                        />
                        {value[0].toUpperCase() + value.slice(1)}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
              <button
                type="button"
                className={cx(BUTTON, "mt-3 w-full")}
                onClick={() =>
                  run(async () => {
                    setSample(await generateTestSample(direction));
                    router.push("/dashboard");
                    onClose();
                  }, "Sample ready for review.")
                }
              >
                Generate sample
              </button>
            </>
          ) : (
            <p className="mt-2 text-small text-smoke">
              Complete onboarding before generating a sample.
            </p>
          )}
        </section>
        <section className="border-t border-vellum-line px-5 py-5">
          <h3 className="text-small font-semibold">Reset</h3>
          <ul className="mt-1 divide-y divide-vellum-line">
            {RESETS.map((reset) => (
              <li key={reset.key} className="py-4">
                <p className="text-small font-medium">{reset.label}</p>
                <p className="mt-1 text-caption  text-smoke">
                  {reset.requiresSchedule && !canRebuild
                    ? "No weekly schedule this week yet."
                    : reset.detail}
                </p>
                {confirmation === reset.key ? (
                  <div className="mt-3 space-y-2 text-caption  text-smoke">
                    <p>Deletes {reset.deletes}.</p>
                    <p>Keeps {reset.keeps}.</p>
                    {reset.returnsToRealDate && (
                      <p>Returns to the real date.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        ref={cancelButton}
                        type="button"
                        className={BUTTON}
                        onClick={() => setConfirmation(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={cx(BUTTON, "text-danger-ink")}
                        onClick={() =>
                          run(async () => {
                            await reset.action();
                            setSample(null);
                            if (reset.returnsToRealDate) setCurrentWeek(null);
                            router.push(
                              reset.destination,
                            );
                          }, `${reset.label} complete.`)
                        }
                      >
                        {reset.confirmLabel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    ref={(button) => {
                      if (button) resetButtons.current.set(reset.key, button);
                      else resetButtons.current.delete(reset.key);
                    }}
                    type="button"
                    className={cx(BUTTON, "mt-2")}
                    disabled={reset.requiresSchedule && !canRebuild}
                    onClick={() => {
                      setNotice(null);
                      setError(null);
                      setConfirmation(reset.key);
                    }}
                  >
                    {reset.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </fieldset>
      <div className="px-5 pb-5" aria-live="polite">
        {busy && <p className="text-small text-smoke">Updating…</p>}
        {error && (
          <p role="alert" className="text-small text-danger-ink">
            {error}
          </p>
        )}
        {notice && <p className="text-small text-smoke">{notice}</p>}
      </div>
    </div>
  );
}
