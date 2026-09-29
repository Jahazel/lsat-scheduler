"use client";

import { useId, useState } from "react";
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
  "min-h-11 rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-900 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50",
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
}: {
  state: TestControlState;
  onClose: () => void;
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
    <div className="text-ink-900">
      <div className="flex items-start justify-between gap-3 px-5 py-5">
        <div>
          <h2 className="font-semibold">Test controls</h2>
          <p className="mt-3 text-sm text-ink-700">
            {state.simulated ? "Simulated date" : "Using the real date"}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {displaySimulatedDate(state.date)}
          </p>
          <p className="mt-1 text-sm text-ink-700">
            Real date {displaySimulatedDate(state.realDate)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={BUTTON}
          aria-label="Close test controls"
        >
          Close
        </button>
      </div>
      <fieldset disabled={busy} className="min-w-0">
        <section className="border-t border-ink-100 px-5 py-5">
          <h3 className="text-sm font-semibold">
            Week of {displaySimulatedDate(state.weekStartDate)}
          </h3>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day, index) => {
              const target = isoDateInWeek(state.weekStartDate, index);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={target <= state.date}
                  aria-label={target < state.date ? `${displaySimulatedDate(target)}, past date` : target === state.date ? `${displaySimulatedDate(target)}, today` : `Move to ${displaySimulatedDate(target)}`}
                  aria-current={target === state.date ? "date" : undefined}
                  onClick={() => move(target)}
                  className={cx(
                    "min-h-12 rounded-md py-2 text-xs tabular-nums enabled:hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50",
                    target === state.date
                      ? "bg-ink-900 text-white"
                      : "text-ink-900",
                    FOCUS,
                  )}
                >
                  <span className="block">{day}</span>
                  <span className="mt-1 block text-sm">
                    {Number(target.slice(-2))}
                  </span>
                  <span className="mt-1 block h-4 text-xs">{target < state.date ? "Past" : target === state.date ? "Today" : ""}</span>
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
            <label htmlFor={`${id}-date`} className="text-sm font-medium">
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
                  "min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-2 py-2 text-sm",
                  FOCUS,
                )}
              />
              <button className={BUTTON} disabled={!date || date <= state.date}>
                Move
              </button>
            </div>
          </form>
          <p className="mt-3 text-xs leading-5 text-ink-700">
            Dates only move forward. Reset test data returns you to the real
            date.
          </p>
        </section>
        <section className="border-t border-ink-100 px-5 py-5">
          <h3 className="text-sm font-semibold">Sample analytics</h3>
          {state.onboarded ? (
            <>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                Generate values, then review and edit them before approving.
              </p>
              <fieldset className="mt-3">
                <legend className="sr-only">Sample direction</legend>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                  {(["improving", "steady", "slipping"] as const).map(
                    (value) => (
                      <label
                        key={value}
                        className="flex min-h-11 items-center gap-1.5 text-sm"
                      >
                        <input
                          type="radio"
                          name={`${id}-direction`}
                          value={value}
                          checked={direction === value}
                          onChange={() => setDirection(value)}
                          className="accent-accent-600"
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
            <p className="mt-2 text-sm text-ink-700">
              Complete onboarding before generating a sample.
            </p>
          )}
        </section>
        <section className="border-t border-ink-100 px-5 py-5">
          <h3 className="text-sm font-semibold">Reset</h3>
          <ul className="mt-1 divide-y divide-ink-100">
            {RESETS.map((reset) => (
              <li key={reset.key} className="py-4">
                <p className="text-sm font-medium">{reset.label}</p>
                <p className="mt-1 text-xs leading-5 text-ink-700">
                  {reset.requiresSchedule && !canRebuild
                    ? "No weekly schedule this week yet."
                    : reset.detail}
                </p>
                {confirmation === reset.key ? (
                  <div className="mt-3 space-y-2 text-xs leading-5 text-ink-700">
                    <p>Deletes {reset.deletes}.</p>
                    <p>Keeps {reset.keeps}.</p>
                    {reset.returnsToRealDate && (
                      <p>Returns to the real date.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() => setConfirmation(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={cx(BUTTON, "text-red-700")}
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
                    type="button"
                    className={cx(BUTTON, "mt-2")}
                    disabled={reset.requiresSchedule && !canRebuild}
                    onClick={() => setConfirmation(reset.key)}
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
        {busy && <p className="text-sm text-ink-700">Updating…</p>}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-ink-700">{notice}</p>}
      </div>
    </div>
  );
}
